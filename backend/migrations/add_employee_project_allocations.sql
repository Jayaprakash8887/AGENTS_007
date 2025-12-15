-- Migration: Add employee_project_allocations table
-- This table tracks the history of employee-project allocations

CREATE TABLE IF NOT EXISTS employee_project_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Employee and Project references
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Allocation details
    role VARCHAR(100),  -- Role in the project: MEMBER, LEAD, MANAGER, etc.
    allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'REMOVED')),
    
    -- Dates
    allocated_date DATE NOT NULL,
    deallocated_date DATE,
    
    -- Audit
    allocated_by UUID REFERENCES users(id),
    deallocated_by UUID REFERENCES users(id),
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_allocations_tenant ON employee_project_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_allocations_employee ON employee_project_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_allocations_project ON employee_project_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON employee_project_allocations(status);
CREATE INDEX IF NOT EXISTS idx_allocations_employee_status ON employee_project_allocations(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON employee_project_allocations(allocated_date, deallocated_date);

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_project_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_employee_project_allocations_updated_at ON employee_project_allocations;
CREATE TRIGGER trigger_update_employee_project_allocations_updated_at
    BEFORE UPDATE ON employee_project_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_project_allocations_updated_at();

-- Comment on table and columns for documentation
COMMENT ON TABLE employee_project_allocations IS 'Tracks history of employee-project allocations for claim submissions';
COMMENT ON COLUMN employee_project_allocations.status IS 'ACTIVE=currently allocated, COMPLETED=project finished, REMOVED=manually removed';
COMMENT ON COLUMN employee_project_allocations.allocation_percentage IS 'Percentage of time allocated to this project (0-100)';
COMMENT ON COLUMN employee_project_allocations.role IS 'Role in the project: MEMBER, LEAD, MANAGER, etc.';
