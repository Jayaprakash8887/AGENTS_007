"""
Settings API endpoints for system configuration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
import json
import logging

from database import get_sync_db
from models import SystemSettings
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class SettingUpdate(BaseModel):
    """Model for updating a single setting"""
    value: Any
    
    class Config:
        from_attributes = True


class GeneralSettingsUpdate(BaseModel):
    """Model for updating general settings"""
    ai_processing: Optional[bool] = None
    auto_approval: Optional[bool] = None
    default_currency: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    email_notifications: Optional[bool] = None
    notification_email: Optional[str] = None
    
    class Config:
        from_attributes = True


class GeneralSettingsResponse(BaseModel):
    """Response model for general settings"""
    ai_processing: bool = True
    auto_approval: bool = True
    default_currency: str = "inr"
    fiscal_year_start: str = "apr"
    email_notifications: bool = True
    notification_email: str = ""
    
    class Config:
        from_attributes = True


# Default settings
DEFAULT_SETTINGS = {
    "ai_processing": {"value": "true", "type": "boolean", "description": "Enable AI for OCR and validation", "category": "general"},
    "auto_approval": {"value": "true", "type": "boolean", "description": "Auto-approve high confidence claims (≥95%)", "category": "general"},
    "default_currency": {"value": "inr", "type": "string", "description": "Default currency for expenses", "category": "general"},
    "fiscal_year_start": {"value": "apr", "type": "string", "description": "Fiscal year start month", "category": "general"},
    "email_notifications": {"value": "true", "type": "boolean", "description": "Send email notifications for claim updates", "category": "notifications"},
    "notification_email": {"value": "", "type": "string", "description": "System notification email address", "category": "notifications"},
}


def get_setting_value(db: Session, key: str, tenant_id: UUID) -> Optional[str]:
    """Get a setting value from the database"""
    setting = db.query(SystemSettings).filter(
        and_(
            SystemSettings.setting_key == key,
            SystemSettings.tenant_id == tenant_id
        )
    ).first()
    return setting.setting_value if setting else None


def set_setting_value(db: Session, key: str, value: str, tenant_id: UUID, setting_type: str = "string", description: str = None, category: str = "general") -> SystemSettings:
    """Set a setting value in the database"""
    setting = db.query(SystemSettings).filter(
        and_(
            SystemSettings.setting_key == key,
            SystemSettings.tenant_id == tenant_id
        )
    ).first()
    
    if setting:
        setting.setting_value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = SystemSettings(
            tenant_id=tenant_id,
            setting_key=key,
            setting_value=value,
            setting_type=setting_type,
            description=description,
            category=category
        )
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return setting


def parse_bool(value: str) -> bool:
    """Parse a boolean value from string"""
    return value.lower() in ("true", "1", "yes", "on")


@router.get("/general", response_model=GeneralSettingsResponse)
def get_general_settings(db: Session = Depends(get_sync_db)):
    """Get all general settings"""
    tenant_id = UUID(settings.DEFAULT_TENANT_ID)
    
    result = GeneralSettingsResponse()
    
    for key, default in DEFAULT_SETTINGS.items():
        value = get_setting_value(db, key, tenant_id)
        if value is None:
            value = default["value"]
        
        # Convert to appropriate type
        if default["type"] == "boolean":
            setattr(result, key, parse_bool(value))
        else:
            setattr(result, key, value)
    
    return result


@router.put("/general", response_model=GeneralSettingsResponse)
def update_general_settings(
    updates: GeneralSettingsUpdate,
    db: Session = Depends(get_sync_db)
):
    """Update general settings"""
    tenant_id = UUID(settings.DEFAULT_TENANT_ID)
    
    # Update each provided setting
    updates_dict = updates.model_dump(exclude_none=True)
    
    for key, value in updates_dict.items():
        if key in DEFAULT_SETTINGS:
            default = DEFAULT_SETTINGS[key]
            # Convert value to string for storage
            if isinstance(value, bool):
                str_value = "true" if value else "false"
            else:
                str_value = str(value)
            
            set_setting_value(
                db, 
                key, 
                str_value, 
                tenant_id,
                setting_type=default["type"],
                description=default["description"],
                category=default["category"]
            )
            logger.info(f"Updated setting {key} to {str_value}")
    
    # Return updated settings
    return get_general_settings(db)


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_sync_db)):
    """Get a specific setting by key"""
    tenant_id = UUID(settings.DEFAULT_TENANT_ID)
    
    value = get_setting_value(db, key, tenant_id)
    if value is None and key in DEFAULT_SETTINGS:
        value = DEFAULT_SETTINGS[key]["value"]
    
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting '{key}' not found"
        )
    
    # Get type info
    setting_type = DEFAULT_SETTINGS.get(key, {}).get("type", "string")
    
    # Parse value based on type
    if setting_type == "boolean":
        parsed_value = parse_bool(value)
    elif setting_type == "number":
        try:
            parsed_value = float(value)
        except ValueError:
            parsed_value = value
    elif setting_type == "json":
        try:
            parsed_value = json.loads(value)
        except json.JSONDecodeError:
            parsed_value = value
    else:
        parsed_value = value
    
    return {
        "key": key,
        "value": parsed_value,
        "type": setting_type
    }


@router.put("/{key}")
def update_setting(
    key: str,
    update: SettingUpdate,
    db: Session = Depends(get_sync_db)
):
    """Update a specific setting"""
    tenant_id = UUID(settings.DEFAULT_TENANT_ID)
    
    # Get default info if available
    default = DEFAULT_SETTINGS.get(key, {"type": "string", "description": None, "category": "general"})
    
    # Convert value to string for storage
    value = update.value
    if isinstance(value, bool):
        str_value = "true" if value else "false"
    elif isinstance(value, (dict, list)):
        str_value = json.dumps(value)
    else:
        str_value = str(value)
    
    setting = set_setting_value(
        db,
        key,
        str_value,
        tenant_id,
        setting_type=default["type"],
        description=default.get("description"),
        category=default.get("category", "general")
    )
    
    return {
        "key": key,
        "value": update.value,
        "updated_at": setting.updated_at
    }


@router.get("/")
def get_all_settings(
    category: Optional[str] = None,
    db: Session = Depends(get_sync_db)
):
    """Get all settings, optionally filtered by category"""
    tenant_id = UUID(settings.DEFAULT_TENANT_ID)
    
    query = db.query(SystemSettings).filter(SystemSettings.tenant_id == tenant_id)
    
    if category:
        query = query.filter(SystemSettings.category == category)
    
    db_settings = query.all()
    
    # Build response with defaults
    result = {}
    
    # Add defaults first
    for key, default in DEFAULT_SETTINGS.items():
        if category and default["category"] != category:
            continue
        
        setting_type = default["type"]
        value = default["value"]
        
        if setting_type == "boolean":
            result[key] = parse_bool(value)
        else:
            result[key] = value
    
    # Override with database values
    for setting in db_settings:
        if setting.setting_type == "boolean":
            result[setting.setting_key] = parse_bool(setting.setting_value)
        elif setting.setting_type == "number":
            try:
                result[setting.setting_key] = float(setting.setting_value)
            except ValueError:
                result[setting.setting_key] = setting.setting_value
        elif setting.setting_type == "json":
            try:
                result[setting.setting_key] = json.loads(setting.setting_value)
            except json.JSONDecodeError:
                result[setting.setting_key] = setting.setting_value
        else:
            result[setting.setting_key] = setting.setting_value
    
    return result
