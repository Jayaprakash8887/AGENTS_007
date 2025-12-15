"""
Migration script to merge Employee and User tables into a single User table.
This eliminates redundancy and foreign key complexity.

Run this script after backing up the database:
    python migrations/merge_employee_user.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SyncSessionLocal, sync_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQL migration statements - each statement separated for execution
MIGRATION_STEPS = [
    # Step 1: Add employee fields to users table
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_joining DATE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'ACTIVE'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS user_data JSONB DEFAULT '{}'",
    
    # Step 2: Copy employee data to users table
    """UPDATE users u
SET 
    employee_code = e.employee_id,
    first_name = e.first_name,
    last_name = e.last_name,
    phone = e.phone,
    mobile = e.mobile,
    address = e.address,
    department = e.department,
    designation = e.designation,
    date_of_joining = e.date_of_joining,
    employment_status = e.employment_status,
    user_data = COALESCE(e.employee_data, '{}')
FROM employees e
WHERE u.employee_id = e.id""",

    # Step 3: For users without linked employee, set their name from full_name
    """UPDATE users
SET 
    first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
    last_name = COALESCE(last_name, CASE WHEN full_name LIKE '% %' THEN substring(full_name from position(' ' in full_name) + 1) ELSE '' END),
    employee_code = COALESCE(employee_code, 'USR-' || substring(id::text from 1 for 8))
WHERE first_name IS NULL""",

    # Step 4: Drop old FK constraints BEFORE updating data
    "ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_employee_id_fkey",
    "ALTER TABLE employee_project_allocations DROP CONSTRAINT IF EXISTS employee_project_allocations_employee_id_fkey",
    "ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey",

    # Step 5: Create mapping table for employee_id -> user_id
    """DROP TABLE IF EXISTS emp_user_mapping""",
    """CREATE TEMPORARY TABLE emp_user_mapping AS
SELECT e.id as employee_id, u.id as user_id
FROM employees e
JOIN users u ON u.employee_id = e.id""",

    # Step 6: Update claims to use user_id
    """UPDATE claims c
SET employee_id = m.user_id
FROM emp_user_mapping m
WHERE c.employee_id = m.employee_id""",

    # Step 7: Update employee_project_allocations to reference users
    """UPDATE employee_project_allocations epa
SET employee_id = m.user_id
FROM emp_user_mapping m
WHERE epa.employee_id = m.employee_id""",

    # Step 8: Update projects manager_id to reference users
    """UPDATE projects p
SET manager_id = m.user_id
FROM emp_user_mapping m
WHERE p.manager_id = m.employee_id""",

    # Step 9: Update manager_id in users (self-referencing)
    """UPDATE users u
SET manager_id = m.user_id
FROM employees e
JOIN emp_user_mapping m ON m.employee_id = e.manager_id
WHERE u.employee_id = e.id AND e.manager_id IS NOT NULL""",

    # Step 10: Drop the old employee_id column from users (the FK to employees)
    "ALTER TABLE users DROP COLUMN IF EXISTS employee_id",

    # Step 11: Add new FK constraints to users table
    "ALTER TABLE claims ADD CONSTRAINT claims_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id)",
    "ALTER TABLE employee_project_allocations ADD CONSTRAINT employee_project_allocations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id)",
    "ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id)",

    # Step 12: Add unique constraint on employee_code
    "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_employee_code_unique",
    "ALTER TABLE users ADD CONSTRAINT users_employee_code_unique UNIQUE (employee_code)",

    # Step 13: Create indexes
    "CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code)",
    "CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)",
    "CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id)",
]

# SQL to verify migration
VERIFY_SQL = """
SELECT 
    'users' as table_name,
    count(*) as record_count,
    count(DISTINCT employee_code) as unique_emp_codes,
    count(*) FILTER (WHERE first_name IS NOT NULL) as has_first_name
FROM users

UNION ALL

SELECT 
    'claims' as table_name,
    count(*) as record_count,
    count(DISTINCT employee_id) as unique_emp_ids,
    count(*) FILTER (WHERE employee_id IN (SELECT id FROM users)) as valid_refs
FROM claims

UNION ALL

SELECT 
    'employee_project_allocations' as table_name,
    count(*) as record_count,
    count(DISTINCT employee_id) as unique_emp_ids,
    count(*) FILTER (WHERE employee_id IN (SELECT id FROM users)) as valid_refs
FROM employee_project_allocations;
"""


def run_migration():
    """Execute the migration"""
    logger.info("Starting Employee-User merge migration...")
    
    with sync_engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Execute migration SQL statement by statement
            for i, stmt in enumerate(MIGRATION_STEPS):
                logger.info(f"Executing step {i+1}/{len(MIGRATION_STEPS)}")
                try:
                    conn.execute(text(stmt))
                except Exception as e:
                    if 'already exists' in str(e).lower() or 'does not exist' in str(e).lower():
                        logger.warning(f"Step {i+1} skipped: {str(e)[:100]}")
                    else:
                        raise
            
            # Commit transaction
            trans.commit()
            logger.info("Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            logger.error(f"Migration failed: {e}")
            raise
    
    # Verify migration in a new connection
    logger.info("\nVerification results:")
    with sync_engine.connect() as conn:
        result = conn.execute(text(VERIFY_SQL))
        for row in result:
            logger.info(f"  {row}")


def drop_employees_table():
    """Drop the employees table after verification"""
    logger.warning("This will permanently delete the employees table!")
    confirm = input("Type 'DROP' to confirm: ")
    
    if confirm != 'DROP':
        logger.info("Aborted.")
        return
    
    with sync_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS employees CASCADE"))
        conn.commit()
        logger.info("Employees table dropped successfully.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Merge Employee and User tables')
    parser.add_argument('--drop-employees', action='store_true', help='Drop employees table after migration')
    args = parser.parse_args()
    
    run_migration()
    
    if args.drop_employees:
        drop_employees_table()
