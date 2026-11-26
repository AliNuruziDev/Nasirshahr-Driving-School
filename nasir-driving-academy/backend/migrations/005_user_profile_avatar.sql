-- Profile photos are stored as private object-storage files.
-- PostgreSQL keeps only the storage key and file metadata, never image bytes.
CREATE TABLE IF NOT EXISTS user_profile_avatars (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 8388608),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_avatars_updated ON user_profile_avatars(updated_at DESC);
