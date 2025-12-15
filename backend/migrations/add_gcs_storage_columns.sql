-- Migration: Add GCS storage columns to documents table
-- Date: 2025-12-14

-- Add GCS-related columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS gcs_uri VARCHAR(500),
ADD COLUMN IF NOT EXISTS gcs_blob_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);

-- Update existing documents to have storage_type = 'local'
UPDATE documents 
SET storage_type = 'local' 
WHERE storage_type IS NULL;

-- Add index for efficient queries on GCS documents
CREATE INDEX IF NOT EXISTS idx_documents_storage_type ON documents(storage_type);
CREATE INDEX IF NOT EXISTS idx_documents_gcs_blob ON documents(gcs_blob_name);
