"""
Complete the Employee-User merge migration.
This script handles the current partially migrated state.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import sync_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Execute the remaining migration steps"""
    logger.info("Completing Employee-User merge migration...")
    
    steps = [
        # Ensure first_name/last_name are set for all users
        ("Set first_name from full_name where NULL", """
            UPDATE users
            SET 
                first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
                last_name = COALESCE(last_name, 
                    CASE WHEN full_name LIKE '% %' 
                    THEN substring(full_name from position(' ' in full_name) + 1) 
                    ELSE '' END),
                employee_code = COALESCE(employee_code, 'USR-' || substring(id::text from 1 for 8))
            WHERE first_name IS NULL
        """),
        
        # Drop old FK constraints (if they still exist)
        ("Drop claims FK (if exists)", "ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_employee_id_fkey"),
        ("Drop allocations FK (if exists)", "ALTER TABLE employee_project_allocations DROP CONSTRAINT IF EXISTS employee_project_allocations_employee_id_fkey"),
        ("Drop projects FK (if exists)", "ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey"),
        
        # Add new FK constraints to users table
        ("Add claims FK to users", "ALTER TABLE claims ADD CONSTRAINT claims_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id)"),
        ("Add allocations FK to users", "ALTER TABLE employee_project_allocations ADD CONSTRAINT employee_project_allocations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES users(id)"),
        ("Add projects FK to users", "ALTER TABLE projects ADD CONSTRAINT projects_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id)"),
        
        # Add unique constraint on employee_code (if not exists)
        ("Drop employee_code unique (cleanup)", "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_employee_code_unique"),
        ("Add employee_code unique", "ALTER TABLE users ADD CONSTRAINT users_employee_code_unique UNIQUE (employee_code)"),
        
        # Create indexes
        ("Create employee_code index", "CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code)"),
        ("Create department index", "CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)"),
        ("Create manager index", "CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id)"),
        
        # Add self-referencing FK for manager
        ("Add manager FK", "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_manager_id_fkey"),
        ("Add manager FK constraint", "ALTER TABLE users ADD CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id)"),
    ]
    
    with sync_engine.connect() as conn:
        for step_name, sql in steps:
            try:
                logger.info(f"Executing: {step_name}")
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                error_str = str(e).lower()
                if 'already exists' in error_str or 'does not exist' in error_str or 'duplicate' in error_str:
                    logger.warning(f"  Skipped (already done): {str(e)[:80]}")
                    conn.rollback()
                else:
                    logger.error(f"  Failed: {e}")
                    conn.rollback()
                    raise
    
    logger.info("Migration completed successfully!")
    
    # Verify
    with sync_engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE first_name IS NOT NULL"))
        logger.info(f"Users with first_name: {result.scalar()}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM claims"))
        logger.info(f"Total claims: {result.scalar()}")


if __name__ == "__main__":
    run_migration()
