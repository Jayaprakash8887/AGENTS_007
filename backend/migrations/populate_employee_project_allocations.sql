-- Migration: Populate employee_project_allocations from existing employee_data.project_ids
-- Run this after add_employee_project_allocations.sql

-- This script will create allocation records for existing employees
-- who already have project_ids in their employee_data JSONB field

INSERT INTO employee_project_allocations (
    id,
    tenant_id,
    employee_id,
    project_id,
    role,
    allocation_percentage,
    status,
    allocated_date,
    notes,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    e.tenant_id,
    e.id as employee_id,
    p.id as project_id,
    'MEMBER' as role,
    100 as allocation_percentage,
    'ACTIVE' as status,
    COALESCE(e.date_of_joining, CURRENT_DATE) as allocated_date,
    'Migrated from employee_data.project_ids' as notes,
    NOW() as created_at,
    NOW() as updated_at
FROM employees e
CROSS JOIN LATERAL jsonb_array_elements_text(
    COALESCE(e.employee_data->'project_ids', '[]'::jsonb)
) as project_id_str
JOIN projects p ON p.id::text = project_id_str
WHERE NOT EXISTS (
    -- Don't insert if allocation already exists
    SELECT 1 FROM employee_project_allocations epa 
    WHERE epa.employee_id = e.id 
    AND epa.project_id = p.id
    AND epa.status = 'ACTIVE'
);

-- Output count of migrated records
SELECT 'Migrated ' || COUNT(*) || ' project allocations from employee_data' as migration_result
FROM employee_project_allocations
WHERE notes = 'Migrated from employee_data.project_ids';
