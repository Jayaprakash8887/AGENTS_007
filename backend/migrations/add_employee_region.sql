-- Migration: Add region column to employees table
-- This column allows region-based filtering of policies for employees

-- Add region column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS region VARCHAR(50);

-- Update existing employees to have a default region (INDIA)
UPDATE employees SET region = 'INDIA' WHERE region IS NULL;

-- Add index for faster region-based queries
CREATE INDEX IF NOT EXISTS idx_employees_region ON employees(region);
