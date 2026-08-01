-- ============================================================================
-- SOCIETY MANAGEMENT SYSTEM — DATABASE SCHEMA (schema.sql)
-- Single-society deployment (one organization per instance)
-- Dialect: PostgreSQL
-- Tables: 15
-- ============================================================================

-- ============================================================================
-- 1. SOCIETY (single row - org-level info)
-- ============================================================================

CREATE TABLE society (
    society_id                 BIGSERIAL PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(20),
    contact_email       VARCHAR(150),
    contact_phone       VARCHAR(20),
    total_blocks        INT DEFAULT 0,
    total_flats         INT DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. USERS & AUTH
-- ============================================================================

CREATE TABLE users (
    user_id                  BIGSERIAL PRIMARY KEY,
    username            VARCHAR(100) NOT NULL UNIQUE,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    phone               VARCHAR(20),
    role                VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'committee_member', 'resident', 'security')),
    status              VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url          TEXT,
    last_login_at       TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
    session_id          BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_token       TEXT NOT NULL UNIQUE,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    expires_at          TIMESTAMP NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
    reset_token_id      BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token               TEXT NOT NULL UNIQUE,
    expires_at          TIMESTAMP NOT NULL,
    used_at             TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. BLOCKS / TOWERS
-- ============================================================================

CREATE TABLE blocks (
    block_id            BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT,
    total_floors        INT,
    total_flats         INT DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. FLATS
-- ============================================================================

CREATE TABLE flats (
    flat_id             BIGSERIAL PRIMARY KEY,
    block_id            BIGINT NOT NULL REFERENCES blocks(block_id) ON DELETE CASCADE,
    flat_number         VARCHAR(20) NOT NULL,
    floor               INT,
    flat_type           VARCHAR(20),
    area_sqft           NUMERIC(10,2),
    occupancy_status    VARCHAR(20) NOT NULL CHECK (occupancy_status IN ('occupied', 'vacant', 'rented')),
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(block_id, flat_number)
);

-- ============================================================================
-- 5. RESIDENTS
-- ============================================================================

CREATE TABLE residents (
    resident_id         BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    flat_id             BIGINT NOT NULL REFERENCES flats(flat_id) ON DELETE CASCADE,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(150),
    phone               VARCHAR(20),
    resident_type       VARCHAR(20) NOT NULL CHECK (resident_type IN ('owner', 'tenant', 'family_member')),
    is_primary_contact  BOOLEAN NOT NULL DEFAULT false,
    move_in_date        DATE,
    move_out_date       DATE,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('active', 'moved_out', 'inactive')),
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. VISITORS
-- ============================================================================

CREATE TABLE visitors (
    visitor_id          BIGSERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    phone               VARCHAR(20),
    purpose             VARCHAR(255),
    vehicle_number      VARCHAR(30),
    photo_url           TEXT,
    flat_id             BIGINT REFERENCES flats(flat_id) ON DELETE SET NULL,
    host_resident_id    BIGINT REFERENCES residents(resident_id) ON DELETE SET NULL,
    registered_by       BIGINT NOT NULL REFERENCES users(user_id),
    check_in_time       TIMESTAMP NOT NULL DEFAULT now(),
    check_out_time      TIMESTAMP,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('checked_in', 'checked_out', 'denied')),
    remarks             TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. COMPLAINTS
-- ============================================================================

CREATE TABLE complaints (
    complaint_id        BIGSERIAL PRIMARY KEY,
    resident_id         BIGINT NOT NULL REFERENCES residents(resident_id) ON DELETE CASCADE,
    flat_id             BIGINT NOT NULL REFERENCES flats(flat_id) ON DELETE CASCADE,
    category            VARCHAR(100),
    subject             VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened')),
    priority            VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to         BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMP,
    closed_at           TIMESTAMP
);

CREATE TABLE complaint_history (
    history_id          BIGSERIAL PRIMARY KEY,
    complaint_id        BIGINT NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    changed_by          BIGINT NOT NULL REFERENCES users(user_id),
    old_status          VARCHAR(20) CHECK (old_status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened')),
    new_status          VARCHAR(20) NOT NULL CHECK (new_status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened')),
    note                TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. NOTICE BOARD
-- ============================================================================

CREATE TABLE notices (
    notice_id           BIGSERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    content             TEXT NOT NULL,
    posted_by           BIGINT NOT NULL REFERENCES users(user_id),
    valid_from          TIMESTAMP NOT NULL DEFAULT now(),
    valid_until         TIMESTAMP,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    is_archived         BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. MAINTENANCE MANAGEMENT
-- ============================================================================

CREATE TABLE maintenance_bills (
    bill_id             BIGSERIAL PRIMARY KEY,
    flat_id             BIGINT NOT NULL REFERENCES flats(flat_id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end   DATE NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    due_date            DATE NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
    generated_by        BIGINT REFERENCES users(user_id),
    generated_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_payments (
    payment_id          BIGSERIAL PRIMARY KEY,
    bill_id             BIGINT NOT NULL REFERENCES maintenance_bills(bill_id) ON DELETE CASCADE,
    amount_paid         NUMERIC(12,2) NOT NULL,
    payment_date        TIMESTAMP NOT NULL DEFAULT now(),
    payment_mode        VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'cheque', 'upi', 'card', 'net_banking', 'other')),
    transaction_ref     VARCHAR(150),
    recorded_by         BIGINT REFERENCES users(user_id),
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    notification_id     BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type                VARCHAR(20) NOT NULL CHECK (type IN ('notice', 'complaint', 'maintenance', 'visitor', 'system')),
    title               VARCHAR(255) NOT NULL,
    message             TEXT,
    reference_id        BIGINT,
    is_read             BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. SETTINGS (key-value app configuration)
-- ============================================================================

CREATE TABLE settings (
    setting_id          BIGSERIAL PRIMARY KEY,
    setting_key         VARCHAR(150) NOT NULL UNIQUE,
    setting_value       TEXT,
    description         TEXT,
    updated_by          BIGINT REFERENCES users(user_id),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR COMMON LOOKUPS
-- ============================================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_flats_block_id ON flats(block_id);
CREATE INDEX idx_flats_occupancy_status ON flats(occupancy_status);
CREATE INDEX idx_residents_flat_id ON residents(flat_id);
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_residents_user_id ON residents(user_id);
CREATE INDEX idx_visitors_flat_id ON visitors(flat_id);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time);
CREATE INDEX idx_complaints_resident_id ON complaints(resident_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX idx_complaint_history_complaint_id ON complaint_history(complaint_id);
CREATE INDEX idx_notices_is_active ON notices(is_active);
CREATE INDEX idx_notices_valid_until ON notices(valid_until);
CREATE INDEX idx_maintenance_bills_flat_id ON maintenance_bills(flat_id);
CREATE INDEX idx_maintenance_bills_status ON maintenance_bills(status);
CREATE INDEX idx_maintenance_bills_due_date ON maintenance_bills(due_date);
CREATE INDEX idx_maintenance_payments_bill_id ON maintenance_payments(bill_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
-- ============================================================================
-- SEED DATA (Default Admin User)
-- ============================================================================

-- Password: password123
INSERT INTO users (username, email, password_hash, full_name, role, status) 
VALUES (
    'admin', 
    'admin@society.com', 
    '$2b$12$sDgWkdh5bVdkudjnWmGxkuznceQN6shSANWBRAP0d2eg5SuNw7ft2', 
    'System Admin', 
    'admin', 
    'active'
);
-- ============================================================================
-- END OF SCHEMA (15 tables)
-- ============================================================================