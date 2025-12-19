"""
Timezone utility module for tenant-specific timezone handling.
Default timezone is IST (Indian Standard Time), but can be configured per tenant.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
import pytz

# Common timezone definitions
TIMEZONE_CHOICES = {
    "IST": "Asia/Kolkata",           # Indian Standard Time (UTC+5:30)
    "UTC": "UTC",                     # Coordinated Universal Time
    "EST": "America/New_York",        # Eastern Standard Time
    "PST": "America/Los_Angeles",     # Pacific Standard Time
    "GMT": "Europe/London",           # Greenwich Mean Time
    "CET": "Europe/Paris",            # Central European Time
    "JST": "Asia/Tokyo",              # Japan Standard Time
    "AEST": "Australia/Sydney",       # Australian Eastern Standard Time
    "SGT": "Asia/Singapore",          # Singapore Time
    "GST": "Asia/Dubai",              # Gulf Standard Time
}

# Date format choices
DATE_FORMAT_CHOICES = {
    "DD/MM/YYYY": "%d/%m/%Y",         # India, UK, most of the world
    "MM/DD/YYYY": "%m/%d/%Y",         # USA
    "YYYY-MM-DD": "%Y-%m-%d",         # ISO format
    "DD-MM-YYYY": "%d-%m-%Y",         # Alternative with dashes
    "DD.MM.YYYY": "%d.%m.%Y",         # Germany, many European countries
}

# Number format choices (decimal_separator, thousands_separator)
NUMBER_FORMAT_CHOICES = {
    "en-IN": {"decimal": ".", "thousands": ",", "label": "Indian (1,00,000.00)"},
    "en-US": {"decimal": ".", "thousands": ",", "label": "US/UK (100,000.00)"},
    "de-DE": {"decimal": ",", "thousands": ".", "label": "German (100.000,00)"},
    "fr-FR": {"decimal": ",", "thousands": " ", "label": "French (100 000,00)"},
    "es-ES": {"decimal": ",", "thousands": ".", "label": "Spanish (100.000,00)"},
}

# Working days choices
WORKING_DAYS_CHOICES = {
    "mon-fri": {"days": [0, 1, 2, 3, 4], "label": "Monday - Friday"},
    "mon-sat": {"days": [0, 1, 2, 3, 4, 5], "label": "Monday - Saturday"},
    "sun-thu": {"days": [6, 0, 1, 2, 3], "label": "Sunday - Thursday"},
    "sat-wed": {"days": [5, 6, 0, 1, 2], "label": "Saturday - Wednesday"},
}

# Week start day choices
WEEK_START_CHOICES = {
    "sunday": {"day": 6, "label": "Sunday"},
    "monday": {"day": 0, "label": "Monday"},
    "saturday": {"day": 5, "label": "Saturday"},
}

# Session timeout choices (in minutes)
SESSION_TIMEOUT_CHOICES = {
    "30": {"minutes": 30, "label": "30 minutes"},
    "60": {"minutes": 60, "label": "1 hour"},
    "120": {"minutes": 120, "label": "2 hours"},
    "240": {"minutes": 240, "label": "4 hours"},
    "480": {"minutes": 480, "label": "8 hours"},
    "1440": {"minutes": 1440, "label": "24 hours"},
}

# Default values
DEFAULT_TIMEZONE = "IST"
DEFAULT_TZ_NAME = "Asia/Kolkata"
DEFAULT_DATE_FORMAT = "DD/MM/YYYY"
DEFAULT_NUMBER_FORMAT = "en-IN"
DEFAULT_WORKING_DAYS = "mon-fri"
DEFAULT_WEEK_START = "monday"
DEFAULT_SESSION_TIMEOUT = "480"  # 8 hours
DEFAULT_AUTO_APPROVAL_THRESHOLD = 95  # AI confidence threshold for auto-approval
DEFAULT_MAX_AUTO_APPROVAL_AMOUNT = 5000  # Maximum auto-approval amount
DEFAULT_POLICY_COMPLIANCE_THRESHOLD = 80  # AI confidence threshold for policy compliance
DEFAULT_ENABLE_AUTO_APPROVAL = True  # Enable/disable auto-approval feature
DEFAULT_AUTO_SKIP_AFTER_MANAGER = True  # Auto-skip HR/Finance after Manager approval if thresholds met

# IST for backward compatibility
IST = timezone(timedelta(hours=5, minutes=30))


def get_timezone(tz_code: str = DEFAULT_TIMEZONE) -> timezone:
    """
    Get a timezone object from a timezone code.
    """
    tz_name = TIMEZONE_CHOICES.get(tz_code, DEFAULT_TZ_NAME)
    try:
        tz = pytz.timezone(tz_name)
        # Convert to standard timezone offset for the current time
        now = datetime.now(tz)
        return timezone(now.utcoffset())
    except Exception:
        return IST


def get_pytz_timezone(tz_code: str = DEFAULT_TIMEZONE):
    """
    Get a pytz timezone object from a timezone code.
    """
    tz_name = TIMEZONE_CHOICES.get(tz_code, DEFAULT_TZ_NAME)
    try:
        return pytz.timezone(tz_name)
    except Exception:
        return pytz.timezone(DEFAULT_TZ_NAME)


def now_tz(tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """
    Get current datetime in the specified timezone.
    """
    tz = get_pytz_timezone(tz_code)
    return datetime.now(tz)


def now_tz_naive(tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """
    Get current datetime in the specified timezone as a naive datetime.
    Use this for database storage where timezone-aware datetimes may cause issues.
    """
    return now_tz(tz_code).replace(tzinfo=None)


def now_ist() -> datetime:
    """
    Get current datetime in IST (Indian Standard Time).
    This is a convenience function for the default timezone.
    """
    return now_tz(DEFAULT_TIMEZONE)


def now_ist_naive() -> datetime:
    """
    Get current datetime in IST as a naive datetime (without timezone info).
    Use this for database storage where timezone-aware datetimes may cause issues.
    """
    return now_tz_naive(DEFAULT_TIMEZONE)


def first_day_of_month_tz(tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """Get the first day of current month in the specified timezone."""
    now = now_tz(tz_code)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def first_day_of_month_ist() -> datetime:
    """Get the first day of current month in IST."""
    return first_day_of_month_tz(DEFAULT_TIMEZONE)


def today_tz(tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """Get today's date at midnight in the specified timezone."""
    now = now_tz(tz_code)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def today_ist() -> datetime:
    """Get today's date at midnight in IST."""
    return today_tz(DEFAULT_TIMEZONE)


def utc_to_tz(utc_dt: datetime, tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """Convert UTC datetime to specified timezone."""
    if utc_dt is None:
        return None
    tz = get_pytz_timezone(tz_code)
    if utc_dt.tzinfo is None:
        # Assume naive datetime is UTC
        utc_dt = pytz.UTC.localize(utc_dt)
    return utc_dt.astimezone(tz)


def tz_to_utc(dt: datetime, tz_code: str = DEFAULT_TIMEZONE) -> datetime:
    """Convert timezone-aware datetime to UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume naive datetime is in the specified timezone
        tz = get_pytz_timezone(tz_code)
        dt = tz.localize(dt)
    return dt.astimezone(pytz.UTC)


def format_tz(dt: datetime, tz_code: str = DEFAULT_TIMEZONE, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime in the specified timezone."""
    if dt is None:
        return ""
    tz = get_pytz_timezone(tz_code)
    if dt.tzinfo is None:
        # Assume naive datetime is already in the specified timezone
        return dt.strftime(fmt)
    return dt.astimezone(tz).strftime(fmt)


# Backward compatibility aliases
utc_to_ist = lambda dt: utc_to_tz(dt, DEFAULT_TIMEZONE)
ist_to_utc = lambda dt: tz_to_utc(dt, DEFAULT_TIMEZONE)
format_ist = lambda dt, fmt="%Y-%m-%d %H:%M:%S": format_tz(dt, DEFAULT_TIMEZONE, fmt)
