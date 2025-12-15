"""
Database models using SQLAlchemy ORM for PostgreSQL
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date, Text, 
    Numeric, ForeignKey, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

Base = declarative_base()


class Claim(Base):
    """Main claims table with OCR tracking, HR corrections, return workflow"""
    __tablename__ = "claims"
    
    # Identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    claim_number = Column(String(50), unique=True, nullable=False)
    
    # Employee & Claim Info
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    employee_name = Column(String(255), nullable=False)
    department = Column(String(100))
    claim_type = Column(String(20), nullable=False)  # REIMBURSEMENT or ALLOWANCE
    category = Column(String(50), nullable=False)  # CERTIFICATION, TRAVEL, TEAM_LUNCH, ONCALL
    
    # Financial
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR")
    
    # Status & Workflow
    status = Column(String(50), nullable=False, default="PENDING_MANAGER")
    
    # Dates
    submission_date = Column(DateTime(timezone=True))
    claim_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Description
    description = Column(Text)
    
    # Complete claim payload (JSONB for flexibility)
    claim_payload = Column(JSONB, nullable=False, default={})
    
    # OCR extracted text for full-text search
    ocr_text = Column(Text)
    
    # Denormalized fields for fast queries
    total_amount = Column(Numeric(12, 2))
    
    # Return workflow tracking
    returned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    returned_at = Column(DateTime(timezone=True))
    return_reason = Column(Text)
    return_count = Column(Integer, default=0)
    can_edit = Column(Boolean, default=False)
    
    # Settlement tracking
    settled = Column(Boolean, default=False)
    settled_date = Column(DateTime(timezone=True))
    settled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    payment_reference = Column(String(100))
    payment_method = Column(String(20))  # NEFT, RTGS, CHEQUE, CASH, UPI
    amount_paid = Column(Numeric(12, 2))
    
    # Relationships
    employee = relationship("User", back_populates="claims", foreign_keys=[employee_id])
    documents = relationship("Document", back_populates="claim", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="claim", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="claim", cascade="all, delete-orphan")
    agent_executions = relationship("AgentExecution", back_populates="claim", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('AI_PROCESSING', 'PENDING_MANAGER', "
            "'RETURNED_TO_EMPLOYEE', 'MANAGER_APPROVED', 'PENDING_HR', 'HR_APPROVED', "
            "'PENDING_FINANCE', 'FINANCE_APPROVED', 'SETTLED', 'REJECTED')",
            name="valid_status"
        ),
        CheckConstraint("claim_type IN ('REIMBURSEMENT', 'ALLOWANCE')", name="valid_claim_type"),
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('NEFT', 'RTGS', 'CHEQUE', 'CASH', 'UPI')",
            name="valid_payment_method"
        ),
        Index("idx_claims_tenant", "tenant_id"),
        Index("idx_claims_employee", "employee_id"),
        Index("idx_claims_status", "status"),
        Index("idx_claims_status_employee", "status", "employee_id"),
        Index("idx_claims_amount", "amount"),
        Index("idx_claims_submission_date", "submission_date"),
        Index("idx_claims_claim_number", "claim_number"),
        Index("idx_claims_payload_gin", "claim_payload", postgresql_using="gin"),
    )


class User(Base):
    """
    Unified User model combining authentication, authorization, and employee data.
    This replaces the separate Employee table for simpler data management.
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Authentication
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile / Employee Info
    employee_code = Column(String(50), unique=True)  # e.g., EMP001
    first_name = Column(String(100))
    last_name = Column(String(100))
    full_name = Column(String(255))  # Computed or manual
    phone = Column(String(20))
    mobile = Column(String(20))
    address = Column(Text)
    
    # Employment
    department = Column(String(100))
    designation = Column(String(100))
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    date_of_joining = Column(Date)
    employment_status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE, ON_LEAVE
    
    # Roles & Permissions
    roles = Column(ARRAY(String), default=[])  # EMPLOYEE, MANAGER, HR, FINANCE, ADMIN
    
    # Additional data (JSONB for flexibility)
    user_data = Column(JSONB, default={})
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    claims = relationship("Claim", back_populates="employee", foreign_keys="[Claim.employee_id]")
    manager = relationship("User", remote_side=[id], backref="direct_reports")
    
    __table_args__ = (
        Index("idx_users_tenant", "tenant_id"),
        Index("idx_users_username", "username"),
        Index("idx_users_email", "email"),
        Index("idx_users_employee_code", "employee_code"),
        Index("idx_users_department", "department"),
        Index("idx_users_manager", "manager_id"),
    )
    
    @property
    def display_name(self):
        """Get display name, preferring first+last over full_name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.full_name or self.username


# Keep Employee as an alias for backward compatibility during transition
Employee = User


class Document(Base):
    """Uploaded documents with OCR results"""
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    
    # File info
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    storage_path = Column(String(500), nullable=False)  # Local path or GCS blob name
    
    # Cloud storage info
    gcs_uri = Column(String(500))  # Full GCS URI (gs://bucket/path)
    gcs_blob_name = Column(String(500))  # Blob name for signed URL generation
    storage_type = Column(String(20), default="local")  # 'local' or 'gcs'
    content_type = Column(String(100))  # MIME type
    
    # Document type
    document_type = Column(String(50))  # INVOICE, RECEIPT, CERTIFICATE, TICKET, etc.
    
    # OCR results
    ocr_text = Column(Text)
    ocr_data = Column(JSONB, default={})
    ocr_confidence = Column(Float)
    ocr_processed = Column(Boolean, default=False)
    ocr_processed_at = Column(DateTime(timezone=True))
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    claim = relationship("Claim", back_populates="documents")
    
    __table_args__ = (
        Index("idx_documents_tenant", "tenant_id"),
        Index("idx_documents_claim", "claim_id"),
        Index("idx_documents_type", "document_type"),
    )


class Comment(Base):
    """Multi-stakeholder comments with full audit trail"""
    __tablename__ = "comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    
    # Comment data
    comment_text = Column(Text, nullable=False)
    comment_type = Column(String(50), default="GENERAL")  # GENERAL, RETURN, APPROVAL, REJECTION, HR_CORRECTION
    
    # Author
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user_name = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=False)
    
    # Visibility
    visible_to_employee = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    claim = relationship("Claim", back_populates="comments")
    
    __table_args__ = (
        Index("idx_comments_tenant", "tenant_id"),
        Index("idx_comments_claim", "claim_id"),
        Index("idx_comments_created", "created_at"),
    )


class Approval(Base):
    """Approval workflow tracking"""
    __tablename__ = "approvals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    
    # Approval stage
    approval_stage = Column(String(50), nullable=False)  # MANAGER, HR, FINANCE
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approver_name = Column(String(255))
    
    # Decision
    status = Column(String(50), nullable=False)  # PENDING, APPROVED, REJECTED, RETURNED
    decision_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    claim = relationship("Claim", back_populates="approvals")
    
    __table_args__ = (
        Index("idx_approvals_tenant", "tenant_id"),
        Index("idx_approvals_claim", "claim_id"),
        Index("idx_approvals_approver", "approver_id"),
        Index("idx_approvals_status", "status"),
    )


class Project(Base):
    """Project master for project-based claims"""
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Project info
    project_code = Column(String(50), unique=True, nullable=False)
    project_name = Column(String(255), nullable=False)
    description = Column(Text)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Budget
    budget_allocated = Column(Numeric(12, 2))
    budget_spent = Column(Numeric(12, 2), default=0)
    budget_available = Column(Numeric(12, 2))
    
    # Status
    status = Column(String(20), default="ACTIVE")  # ACTIVE, COMPLETED, CLOSED
    
    # Dates
    start_date = Column(Date)
    end_date = Column(Date)
    
    # Additional data
    project_data = Column(JSONB, default={})
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_projects_tenant", "tenant_id"),
        Index("idx_projects_code", "project_code"),
        Index("idx_projects_status", "status"),
    )


class AgentExecution(Base):
    """Agent execution tracking and learning"""
    __tablename__ = "agent_executions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("claims.id"))
    
    # Agent info
    agent_name = Column(String(100), nullable=False)
    agent_version = Column(String(20))
    
    # Execution
    task_id = Column(String(100))  # Celery task ID
    execution_time_ms = Column(Integer)
    
    # Result
    status = Column(String(20), nullable=False)  # SUCCESS, FAILURE, RETRY
    result_data = Column(JSONB, default={})
    error_message = Column(Text)
    
    # Learning metrics
    confidence_score = Column(Float)
    llm_tokens_used = Column(Integer)
    llm_cost = Column(Numeric(10, 6))
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    claim = relationship("Claim", back_populates="agent_executions")
    
    __table_args__ = (
        Index("idx_agent_executions_tenant", "tenant_id"),
        Index("idx_agent_executions_claim", "claim_id"),
        Index("idx_agent_executions_agent", "agent_name"),
        Index("idx_agent_executions_started", "started_at"),
    )


class Policy(Base):
    """Policy documents and rules"""
    __tablename__ = "policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Policy info
    policy_name = Column(String(255), nullable=False)
    policy_type = Column(String(50), nullable=False)  # REIMBURSEMENT, ALLOWANCE
    category = Column(String(50))  # CERTIFICATION, TRAVEL, etc.
    
    # Content
    policy_text = Column(Text, nullable=False)
    policy_rules = Column(JSONB, default={})  # Structured rules
    
    # Version
    version = Column(String(20))
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_policies_tenant", "tenant_id"),
        Index("idx_policies_type", "policy_type"),
        Index("idx_policies_category", "category"),
        Index("idx_policies_active", "is_active"),
    )


class EmployeeProjectAllocation(Base):
    """Tracks history of employee-project allocations"""
    __tablename__ = "employee_project_allocations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Employee and Project references
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    
    # Allocation details
    role = Column(String(100))  # Role in the project: MEMBER, LEAD, MANAGER, etc.
    allocation_percentage = Column(Integer, default=100)  # Percentage allocation (0-100)
    
    # Status
    status = Column(String(20), default="ACTIVE")  # ACTIVE, COMPLETED, REMOVED
    
    # Dates
    allocated_date = Column(Date, nullable=False)
    deallocated_date = Column(Date)  # NULL if still active
    
    # Audit
    allocated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    deallocated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    employee = relationship("User", backref="project_allocations", foreign_keys=[employee_id])
    project = relationship("Project", backref="employee_allocations")
    
    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE', 'COMPLETED', 'REMOVED')", name="valid_allocation_status"),
        CheckConstraint("allocation_percentage >= 0 AND allocation_percentage <= 100", name="valid_allocation_percentage"),
        Index("idx_allocations_tenant", "tenant_id"),
        Index("idx_allocations_employee", "employee_id"),
        Index("idx_allocations_project", "project_id"),
        Index("idx_allocations_status", "status"),
        Index("idx_allocations_employee_status", "employee_id", "status"),
        Index("idx_allocations_dates", "allocated_date", "deallocated_date"),
    )
