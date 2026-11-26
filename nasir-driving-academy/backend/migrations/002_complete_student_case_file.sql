-- NASIR Driving Academy - complete electronic student case file
-- Apply after 001_initial_schema.sql on the production PostgreSQL database.
-- Adjust legal fields/retention policy with the academy before production use.

CREATE TABLE IF NOT EXISTS student_case_profiles (
  student_id UUID PRIMARY KEY REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
  national_id VARCHAR(20),
  birth_date DATE,
  guardian_name VARCHAR(160),
  address TEXT,
  course_name VARCHAR(100),
  workflow_stage VARCHAR(32) NOT NULL DEFAULT 'registered'
    CHECK (workflow_stage IN ('registered','documents_pending','contract_signed','training','theory_exam','practical_exam','completed','archived')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
  contract_number VARCHAR(80) NOT NULL UNIQUE,
  contract_type VARCHAR(100) NOT NULL,
  agreed_amount_toman BIGINT NOT NULL DEFAULT 0 CHECK (agreed_amount_toman >= 0),
  signed_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','cancelled')),
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the amount in Tomans alongside the original Rial-oriented payment record.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_toman BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(24);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type VARCHAR(80);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;

CREATE TABLE IF NOT EXISTS practical_session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
  instructor_id UUID REFERENCES instructor_profiles(user_id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  session_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 300),
  topic VARCHAR(160) NOT NULL,
  attendance VARCHAR(24) NOT NULL DEFAULT 'present' CHECK (attendance IN ('present','absent','rescheduled')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
  exam_type VARCHAR(24) NOT NULL CHECK (exam_type IN ('theory','practical')),
  exam_date DATE NOT NULL,
  score NUMERIC(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  result VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','passed','failed')),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_final_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE RESTRICT,
  final_status VARCHAR(24) NOT NULL DEFAULT 'in_progress'
    CHECK (final_status IN ('in_progress','passed','not_passed','license_issued')),
  result_date DATE,
  license_number VARCHAR(100),
  note TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
  event_type VARCHAR(48) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_case_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(48) NOT NULL,
  entity_id UUID,
  action VARCHAR(48) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_enrollment ON enrollment_contracts(enrollment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practical_reports_enrollment_date ON practical_session_reports(enrollment_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_exams_enrollment_date ON student_exams(enrollment_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_case_timeline_student_date ON student_case_timeline(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_audit_student_date ON student_case_audit_logs(student_id, created_at DESC);

-- Important: every API handler must join through enrollment/student ownership,
-- enforce role permissions, and write audit/timeline records in the same transaction.
