import psycopg
from typing import Optional, List, Dict, Any
from psycopg import Connection
from server.schemas.resident import ResidentCreate, ResidentUpdate

def get_residents(
    conn: Connection, 
    status: Optional[str] = None, 
    flat_id: Optional[int] = None, 
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = """
        SELECT 
            r.resident_id, r.user_id, r.full_name, r.email, r.phone, r.flat_id, 
            r.resident_type, r.status, NULL::text AS occupation, 0 AS family_members_count,
            NULL::text AS emergency_contact_name, NULL::text AS emergency_contact_phone,
            r.is_primary_contact, r.move_in_date,
            b.name AS block_name, 
            f.flat_number
        FROM residents r
        LEFT JOIN flats f ON r.flat_id = f.flat_id
        LEFT JOIN blocks b ON f.block_id = b.block_id
        WHERE 1=1
    """
    params = []
    
    if status:
        query += " AND r.status = %s"
        params.append(status)
    if flat_id:
        query += " AND r.flat_id = %s"
        params.append(flat_id)
    if search:
        query += " AND (r.full_name ILIKE %s OR r.phone ILIKE %s OR r.email ILIKE %s)"
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])
        
    query += " ORDER BY r.created_at DESC;"
    
    rows = conn.execute(query, params).fetchall()
    
    # Format the "A - 102" string for the frontend table
    for row in rows:
        if row.get("block_name") and row.get("flat_number"):
            # Removes "Block " prefix if your DB seeds it that way, e.g., "Block A" -> "A"
            clean_block = row["block_name"].replace("Block ", "").strip()
            row["flat_identifier"] = f"{clean_block} - {row['flat_number']}"
        else:
            row["flat_identifier"] = "Unassigned"
            
    return rows

def create_resident(conn: Connection, resident_data: ResidentCreate) -> Dict[str, Any]:
    query = """
        INSERT INTO residents (
            full_name, email, phone, flat_id, resident_type, status,
            move_in_date, is_primary_contact
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING resident_id;
    """
    params = (
        resident_data.full_name, resident_data.email, resident_data.phone,
        resident_data.flat_id, resident_data.resident_type, resident_data.status,
        resident_data.move_in_date, resident_data.is_primary_contact
    )
    
    # Execute insert
    res = conn.execute(query, params)
    new_id = res.fetchone()["resident_id"]
    
    # Auto-update flat status to 'occupied'
    conn.execute(
        "UPDATE flats SET occupancy_status = 'occupied' WHERE flat_id = %s;", 
        (resident_data.flat_id,)
    )
    
    # Return the fully formatted resident
    return get_resident_by_id(conn, new_id)

def update_resident(conn: Connection, resident_id: int, resident_data: ResidentUpdate) -> Optional[Dict[str, Any]]:
    update_fields = resident_data.model_dump(exclude_unset=True)
    # These UI fields are not columns in the checked-in PostgreSQL schema.
    for unsupported in ("occupation", "family_members_count", "emergency_contact_name", "emergency_contact_phone"):
        update_fields.pop(unsupported, None)
    if not update_fields:
        return None
        
    set_clause = ", ".join([f"{key} = %s" for key in update_fields.keys()])
    query = f"UPDATE residents SET {set_clause}, updated_at = NOW() WHERE resident_id = %s RETURNING resident_id;"
    params = list(update_fields.values()) + [resident_id]
    
    res = conn.execute(query, params)
    if not res.fetchone():
        return None

    if "status" in update_fields:
        account_status = "active" if update_fields["status"] == "active" else "inactive"
        conn.execute(
            "UPDATE users SET status = %s, updated_at = NOW() WHERE user_id = (SELECT user_id FROM residents WHERE resident_id = %s)",
            (account_status, resident_id),
        )
        
    # If flat_id was changed, update statuses
    if "flat_id" in update_fields and update_fields["flat_id"] is not None:
        conn.execute(
            "UPDATE flats SET occupancy_status = 'occupied' WHERE flat_id = %s;", 
            (update_fields["flat_id"],)
        )
        
    return get_resident_by_id(conn, resident_id)

def get_resident_by_id(conn: Connection, resident_id: int) -> Optional[Dict[str, Any]]:
    results = get_residents(conn)
    for r in results:
        if r["resident_id"] == resident_id:
            return r
    return None

def deactivate_resident(conn: Connection, resident_id: int) -> Optional[Dict[str, Any]]:
    """Matches the 'Pause' button in your UI"""
    resident = get_resident_by_id(conn, resident_id)
    if not resident:
        return None
        
    conn.execute(
        "UPDATE residents SET status = 'inactive', updated_at = NOW() WHERE resident_id = %s;", 
        (resident_id,)
    )
    if resident.get("user_id"):
        conn.execute(
            "UPDATE users SET status = 'inactive', updated_at = NOW() WHERE user_id = %s",
            (resident["user_id"],),
        )
    
    # Check if other active residents remain in the flat
    if resident.get("flat_id"):
        count_query = "SELECT COUNT(*) as total FROM residents WHERE flat_id = %s AND status = 'active'"
        count_res = conn.execute(count_query, (resident["flat_id"],)).fetchone()
        
        # If no active residents left, set flat to vacant
        if count_res["total"] == 0:
            conn.execute(
                "UPDATE flats SET occupancy_status = 'vacant' WHERE flat_id = %s;", 
                (resident["flat_id"],)
            )
            
    return get_resident_by_id(conn, resident_id)

def delete_resident(conn: Connection, resident_id: int) -> bool:
    """Hard delete resident (Cascades will handle related complaints/visitors based on your schema)"""
    # Get flat_id before deleting to potentially update flat status
    resident = get_resident_by_id(conn, resident_id)

    if resident and resident.get("user_id"):
        conn.execute(
            "UPDATE users SET status = 'inactive', updated_at = NOW() WHERE user_id = %s",
            (resident["user_id"],),
        )
    
    query = "DELETE FROM residents WHERE resident_id = %s RETURNING resident_id;"
    result = conn.execute(query, (resident_id,))
    
    if result.fetchone():
        # After deletion, check if flat is now empty
        if resident and resident.get("flat_id"):
            count_res = conn.execute(
                "SELECT COUNT(*) as total FROM residents WHERE flat_id = %s", 
                (resident["flat_id"],)
            ).fetchone()
            if count_res["total"] == 0:
                conn.execute(
                    "UPDATE flats SET occupancy_status = 'vacant' WHERE flat_id = %s;", 
                    (resident["flat_id"],)
                )
        return True
    return False
