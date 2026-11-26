-- NASIR Driving Academy — role-specific registration and instructor assignments
-- Apply after migrations 001, 002 and 003.
-- These tables support server-side authorization; UI role switching is only a local demo.

CREATE TABLE IF NOT EXISTS student_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  phone_verified_at TIMESTAMPTZ NOT NULL,
  national_id VARCHAR(20),
  birth_date DATE,
  guardian_name VARCHAR(160),
  guardian_phone VARCHAR(32),
  province VARCHAR(80),
  city VARCHAR(100),
  neighborhood VARCHAR(120),
  postal_code VARCHAR(20),
  address TEXT NOT NULL,
  course_type VARCHAR(100) NOT NULL DEFAULT 'پایه سوم',
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','needs_changes')),
  linked_student_user_id UUID REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registration_request_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES student_registration_requests(id) ON DELETE RESTRICT,
  category VARCHAR(80) NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  checksum_sha256 CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instructor_student_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES instructor_profiles(user_id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  note TEXT,
  CHECK ((is_active AND ended_at IS NULL) OR (NOT is_active AND ended_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_instructor_student_assignment
  ON instructor_student_assignments(instructor_id, student_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_assignments_instructor_active
  ON instructor_student_assignments(instructor_id, assigned_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_assignments_student_active
  ON instructor_student_assignments(student_id, assigned_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_registration_requests_status_date
  ON student_registration_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_request_documents_request
  ON registration_request_documents(request_id, created_at DESC);

-- Access-control invariants required by API handlers:
-- * student: only the authenticated user's own profile, case, documents, schedule, payments.
-- * instructor: only active assigned students; expose limited student fields and own lesson reports.
-- * instructor responses must never include national ID, full address, document bytes or financial rows.
-- * admin: academy-wide access, subject to audit logging and configured permissions.
-- * registration request phone must be verified by one-time code before insert.
-- * application code must enforce ownership in every query and write in one DB transaction.
