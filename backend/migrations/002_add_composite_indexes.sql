-- Migration: Add composite indexes for multi-tenant query optimization
-- Created: 2024-12-18
-- Description: Adds composite indexes to improve query performance for common
--              multi-tenant query patterns (dashboard, approval queue, notifications, etc.)

-- ============================================================
-- CLAIMS TABLE COMPOSITE INDEXES
-- ============================================================

-- Speed up dashboard queries filtering by tenant + status
-- Used in: dashboard summary, claim counts by status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_tenant_status 
ON claims (tenant_id, status);

-- Speed up "my claims" queries (employee dashboard)
-- Used in: employee claim list, claim history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_tenant_employee_status 
ON claims (tenant_id, employee_id, status);

-- Speed up pending approval queue queries
-- Used in: manager approval queue, HR approval queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_tenant_status_created 
ON claims (tenant_id, status, created_at DESC);

-- Speed up duplicate detection queries
-- Used in: duplicate check before claim submission
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_duplicate_check 
ON claims (employee_id, amount, claim_date) 
WHERE status != 'REJECTED';

-- Speed up claim number lookups with tenant scoping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_tenant_claim_number 
ON claims (tenant_id, claim_number);

-- Speed up date-based queries (reports, date range filters)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_tenant_submission_date 
ON claims (tenant_id, submission_date DESC NULLS LAST);


-- ============================================================
-- USERS TABLE COMPOSITE INDEXES
-- ============================================================

-- Speed up employee lookups by tenant + department (team views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_department 
ON users (tenant_id, department);

-- Speed up manager queries (direct reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_manager 
ON users (tenant_id, manager_id) 
WHERE is_active = true;

-- Speed up employee code lookups with tenant scoping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_employee_code 
ON users (tenant_id, employee_code);

-- Speed up email lookups with tenant scoping (login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_email 
ON users (tenant_id, email);


-- ============================================================
-- DOCUMENTS TABLE COMPOSITE INDEXES
-- ============================================================

-- Speed up document processing status checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_tenant_processing 
ON documents (tenant_id, ocr_processed, storage_type);

-- Speed up unprocessed document queries for OCR workers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_pending_ocr 
ON documents (ocr_processed, uploaded_at) 
WHERE ocr_processed = false;


-- ============================================================
-- NOTIFICATIONS TABLE COMPOSITE INDEXES
-- ============================================================

-- Speed up notification list queries (user inbox)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_user_unread 
ON notifications (tenant_id, user_id, is_read, created_at DESC);

-- Speed up unread count queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread_count 
ON notifications (user_id, is_read) 
WHERE is_read = false;


-- ============================================================
-- APPROVALS TABLE COMPOSITE INDEXES
-- ============================================================

-- Speed up pending approval lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approvals_tenant_status_stage 
ON approvals (tenant_id, status, approval_stage);

-- Speed up approver's pending queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approvals_approver_pending 
ON approvals (approver_id, status) 
WHERE status = 'PENDING';


-- ============================================================
-- POLICY_UPLOADS TABLE COMPOSITE INDEXES (if exists)
-- ============================================================

-- Speed up active policy lookups by tenant + region
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_tenant_region_active 
ON policy_uploads (tenant_id, region, status) 
WHERE is_active = true;


-- ============================================================
-- POLICY_CATEGORIES TABLE COMPOSITE INDEXES (if exists)
-- ============================================================

-- Speed up category lookups by policy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_tenant_policy 
ON policy_categories (tenant_id, policy_upload_id);


-- ============================================================
-- COMMENTS TABLE COMPOSITE INDEX
-- ============================================================

-- Speed up comment thread loading
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_claim_created 
ON comments (claim_id, created_at);


-- ============================================================
-- AGENT_EXECUTIONS TABLE COMPOSITE INDEX (if exists)
-- ============================================================

-- Speed up agent execution history for a claim
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_exec_claim_created 
ON agent_executions (claim_id, created_at DESC);


-- ============================================================
-- FULL TEXT SEARCH INDEXES (pg_trgm extension)
-- ============================================================
-- Note: Requires pg_trgm extension. Run first:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search on Users (employees)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_gin 
ON users USING gin (
    (
        coalesce(first_name, '') || ' ' || 
        coalesce(last_name, '') || ' ' || 
        coalesce(email, '') || ' ' ||
        coalesce(employee_code, '')
    ) gin_trgm_ops
);

-- Full-text search on Projects
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_search_gin 
ON projects USING gin (
    (
        coalesce(project_code, '') || ' ' || 
        coalesce(project_name, '') || ' ' || 
        coalesce(description, '')
    ) gin_trgm_ops
);

-- Full-text search on Tenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_search_gin 
ON tenants USING gin (
    (
        coalesce(code, '') || ' ' || 
        coalesce(name, '') || ' ' || 
        coalesce(domain, '')
    ) gin_trgm_ops
);

-- Full-text search on Claims
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_search_gin 
ON claims USING gin (
    (
        coalesce(claim_number, '') || ' ' || 
        coalesce(category, '') || ' ' ||
        coalesce(description, '')
    ) gin_trgm_ops
);

-- Full-text search on Policy Uploads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policy_uploads_search_gin 
ON policy_uploads USING gin (
    (
        coalesce(policy_name, '') || ' ' || 
        coalesce(policy_number, '') || ' ' ||
        coalesce(description, '')
    ) gin_trgm_ops
);

-- Full-text search on Policy Categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policy_categories_search_gin 
ON policy_categories USING gin (
    (
        coalesce(category_name, '') || ' ' || 
        coalesce(category_code, '') || ' ' ||
        coalesce(description, '')
    ) gin_trgm_ops
);

-- ============================================================
-- USAGE EXAMPLES for pg_trgm full-text search:
-- ============================================================
-- 
-- Search users by partial name/email:
--   SELECT * FROM users 
--   WHERE (first_name || ' ' || last_name || ' ' || email) ILIKE '%john%';
--
-- Or using similarity for fuzzy matching:
--   SELECT *, similarity(first_name || ' ' || last_name, 'Jon Smith') as sim
--   FROM users 
--   WHERE (first_name || ' ' || last_name) % 'Jon Smith'
--   ORDER BY sim DESC;
--
-- Search projects:
--   SELECT * FROM projects WHERE project_name ILIKE '%marketing%';
--
-- Search claims:
--   SELECT * FROM claims WHERE claim_number ILIKE '%CLM-2024%';
