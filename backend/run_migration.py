#!/usr/bin/env python3
"""
Run database migration to add mobile and address columns
"""
import sys
import os

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import sync_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Execute the migration SQL"""
    migration_sql = """
    -- Add mobile column
    ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);

    -- Add address column
    ALTER TABLE employees 
    ADD COLUMN IF NOT EXISTS address TEXT;

    -- Add index on mobile for faster searches
    CREATE INDEX IF NOT EXISTS idx_employees_mobile ON employees(mobile);
    """
    
    try:
        with sync_engine.connect() as conn:
            logger.info("Starting migration: Adding mobile and address columns...")
            conn.execute(text(migration_sql))
            conn.commit()
            logger.info("✓ Migration completed successfully!")
            logger.info("  - Added 'mobile' column to employees table")
            logger.info("  - Added 'address' column to employees table")
            logger.info("  - Created index on mobile column")
    except Exception as e:
        logger.error(f"✗ Migration failed: {e}")
        raise


if __name__ == "__main__":
    run_migration()
