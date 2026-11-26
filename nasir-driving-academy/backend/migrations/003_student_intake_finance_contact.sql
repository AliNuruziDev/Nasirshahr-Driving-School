-- NASIR Driving Academy — expanded registration, contact/address and finance fields
-- Apply after 001 and 002. File bytes remain in private object storage.

ALTER TABLE student_case_profiles
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS province VARCHAR(80),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(120),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS national_id VARCHAR(20),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Tuition belongs to the individual enrollment, because a student may take
-- more than one course over time.
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS agreed_tuition_toman BIGINT NOT NULL DEFAULT 0
    CHECK (agreed_tuition_toman >= 0);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cashier_note TEXT;

CREATE INDEX IF NOT EXISTS idx_student_case_profiles_city ON student_case_profiles(city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_student_case_profiles_national_id ON student_case_profiles(national_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tuition ON enrollments(agreed_tuition_toman);
CREATE INDEX IF NOT EXISTS idx_payments_status_received ON payments(status, received_at DESC);

-- API implementation requirements:
-- * POST /students creates user, student_profile, student_case_profile and enrollment transactionally.
-- * The receipt/payment row must be created only by an authorized manager.
-- * Store scans in private object storage; validate actual MIME, file signature, size and scan for malware.
-- * Never expose national_id/address/documents to instructors unless their permissions require it.
-- * Add role-scoped access control, audit events and encrypted backups before real data is entered.
