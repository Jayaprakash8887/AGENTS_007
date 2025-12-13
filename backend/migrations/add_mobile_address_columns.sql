-- Migration: Add mobile and address columns to employees table
-- Date: 2025-12-13
-- Description: Add mobile number and address fields to support employee contact information

-- Add mobile column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);

-- Add address column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add index on mobile for faster searches (optional)
CREATE INDEX IF NOT EXISTS idx_employees_mobile ON employees(mobile);

-- Update existing records to have empty values if needed
UPDATE employees 
SET mobile = COALESCE(mobile, ''), 
    address = COALESCE(address, '')
WHERE mobile IS NULL OR address IS NULL;
