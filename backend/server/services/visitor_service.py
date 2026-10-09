import psycopg
from typing import Optional, List, Dict, Any
from psycopg import Connection
from server.schemas.visitor import VisitorCreate
from server.services.settings_service import system_config

class DailyVisitorLimitError(Exception):
    pass

def get_visitor_hosts(conn: Connection) -> List[Dict[str, Any]]:
    """Return only the fields security needs to select a visit host."""
    return conn.execute(
        """SELECT r.resident_id, r.full_name, r.flat_id, f.flat_number,
                  b.name AS block_name
           FROM residents r
           JOIN flats f ON f.flat_id = r.flat_id
           JOIN blocks b ON b.block_id = f.block_id
           WHERE r.status = 'active'
           ORDER BY b.name, f.flat_number, r.full_name"""
    ).fetchall()

def get_visitors(
    conn: Connection, 
    status: Optional[str] = None, 
    flat_id: Optional[int] = None, 
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetches visitors with JOINs to flats, blocks, and residents for readable UI data.
    Orders by check_in_time DESC to show the most recent visitors first (History).
    """
    query = """
        SELECT 
            v.visitor_id, v.name, v.phone, v.purpose, v.vehicle_number,
            v.flat_id, v.host_resident_id, v.registered_by,
            v.check_in_time, v.check_out_time, v.status, v.remarks,
            b.name AS block_name, 
            f.flat_number,
            r.full_name AS host_name
        FROM visitors v
        LEFT JOIN flats f ON v.flat_id = f.flat_id
        LEFT JOIN blocks b ON f.block_id = b.block_id
        LEFT JOIN residents r ON v.host_resident_id = r.resident_id
        WHERE 1=1
    """
    params = []
    
    if status:
        query += " AND v.status = %s"
        params.append(status)
    if flat_id:
        query += " AND v.flat_id = %s"
        params.append(flat_id)
    if search:
        query += " AND (v.name ILIKE %s OR v.phone ILIKE %s OR v.vehicle_number ILIKE %s)"
        search_term = f"%{search}%"
        params.extend([search_term, search_term, search_term])
        
    query += " ORDER BY v.check_in_time DESC;"
    
    rows = conn.execute(query, params).fetchall()
    
    # Format the "Block A - 102" string
    for row in rows:
        if row.get("block_name") and row.get("flat_number"):
            clean_block = row["block_name"].replace("Block ", "").strip()
            row["flat_identifier"] = f"{clean_block} - {row['flat_number']}"
        else:
            row["flat_identifier"] = "N/A"
            
    return rows

def get_visitor_by_id(conn: Connection, visitor_id: int) -> Optional[Dict[str, Any]]:
    # Reuse the get_visitors function but filter by ID to keep formatting consistent
    results = get_visitors(conn)
    for v in results:
        if v["visitor_id"] == visitor_id:
            return v
    return None

def register_visitor(conn: Connection, visitor_data: VisitorCreate) -> Dict[str, Any]:
    """
    Creates a visitor record. 
    Normalizes status (e.g., 'In' -> 'checked_in') and uses UI provided check_in_time 
    if available, otherwise falls back to database NOW().
    """
    limit = system_config(conn).maxVisitorsPerDay
    today_count = conn.execute(
        "SELECT COUNT(*) AS total FROM visitors WHERE check_in_time::date = CURRENT_DATE"
    ).fetchone()["total"]
    if today_count >= limit:
        raise DailyVisitorLimitError(f"The daily visitor limit of {limit} has been reached")

    # Normalize the status to match DB CHECK constraint
    db_status = "checked_in"
    if visitor_data.status:
        status_lower = visitor_data.status.lower().replace(" ", "_")
        if status_lower in ["checked_in", "in"]:
            db_status = "checked_in"
        elif status_lower in ["checked_out", "out"]:
            db_status = "checked_out"
        elif status_lower == "denied":
            db_status = "denied"

    query = """
        INSERT INTO visitors (
            name, phone, purpose, vehicle_number, flat_id, 
            host_resident_id, registered_by, status, check_in_time, remarks
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, NOW()), %s) 
        RETURNING visitor_id;
    """
    params = (
        visitor_data.name, visitor_data.phone, visitor_data.purpose,
        visitor_data.vehicle_number, visitor_data.flat_id,
        visitor_data.host_resident_id, visitor_data.registered_by, 
        db_status, visitor_data.check_in_time, visitor_data.remarks
    )
    
    res = conn.execute(query, params)
    new_id = res.fetchone()["visitor_id"]
    
    return get_visitor_by_id(conn, new_id)

def check_out_visitor(conn: Connection, visitor_id: int) -> Optional[Dict[str, Any]]:
    """Updates the visitor record with check out time and status."""
    query = """
        UPDATE visitors 
        SET check_out_time = NOW(), status = 'checked_out' 
        WHERE visitor_id = %s AND status = 'checked_in'
        RETURNING visitor_id;
    """
    res = conn.execute(query, (visitor_id,))
    if not res.fetchone():
        return None  # Either doesn't exist or already checked out
        
    return get_visitor_by_id(conn, visitor_id)

def deny_visitor(conn: Connection, visitor_id: int) -> Optional[Dict[str, Any]]:
    """Marks a visitor as denied entry."""
    query = """
        UPDATE visitors 
        SET status = 'denied', check_out_time = NOW() 
        WHERE visitor_id = %s AND status = 'checked_in'
        RETURNING visitor_id;
    """
    res = conn.execute(query, (visitor_id,))
    if not res.fetchone():
        return None
        
    return get_visitor_by_id(conn, visitor_id)
