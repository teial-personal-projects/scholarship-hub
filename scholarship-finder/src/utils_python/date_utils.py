"""
Date utilities for scholarship finder
Handles partial dates, date normalization, and expiration logic
"""
from datetime import datetime, date
from dateutil import parser
from typing import Optional, Union
import re


def normalize_deadline(deadline_str: Union[str, date, datetime, None]) -> Optional[date]:
    """
    Normalize deadline strings to proper date objects

    Handles:
    - Dates without years (e.g., "March 15") -> assumes current or next year
    - Month and year only (e.g., "March 2025") -> assumes first of month
    - Full dates (e.g., "March 15, 2025")
    - Already parsed date/datetime objects

    Args:
        deadline_str: The deadline in various formats

    Returns:
        date object or None if parsing fails
    """
    if not deadline_str:
        return None

    # If already a date or datetime object, convert to date
    if isinstance(deadline_str, datetime):
        return deadline_str.date()
    if isinstance(deadline_str, date):
        return deadline_str

    deadline_str = str(deadline_str).strip()

    if not deadline_str:
        return None

    try:
        # Check if year is missing (e.g., "March 15", "3/15")
        # Look for patterns without 4-digit years
        has_year = bool(re.search(r'\b(19|20)\d{2}\b', deadline_str))

        if not has_year:
            # No year specified - determine if we should use current or next year
            current_date = datetime.now()
            current_year = current_date.year

            # Try parsing with current year
            try:
                # Add current year to the string
                parsed = parser.parse(f"{deadline_str}, {current_year}", fuzzy=True)
                parsed_date = parsed.date()

                # If the date is in the past, assume next year
                if parsed_date < current_date.date():
                    parsed = parser.parse(f"{deadline_str}, {current_year + 1}", fuzzy=True)
                    parsed_date = parsed.date()

                return parsed_date
            except (ValueError, parser.ParserError):
                pass

        # Check if only month and year (e.g., "March 2025", "03/2025")
        month_year_pattern = r'^([A-Za-z]+|0?[1-9]|1[0-2])[/\s-]+(19|20)\d{2}$'
        if re.match(month_year_pattern, deadline_str):
            # Assume first of the month
            parsed = parser.parse(deadline_str, fuzzy=True, default=datetime(2000, 1, 1))
            return parsed.date()

        # Try normal parsing
        parsed = parser.parse(deadline_str, fuzzy=True)
        return parsed.date()

    except (ValueError, parser.ParserError) as e:
        print(f"⚠️  Could not parse deadline: '{deadline_str}' - {e}")
        return None


def is_expired(deadline: Optional[Union[str, date, datetime]], grace_days: int = 0) -> bool:
    """
    Check if a scholarship deadline has passed

    Args:
        deadline: The deadline to check
        grace_days: Number of days after deadline to still consider valid (default: 0)

    Returns:
        True if expired, False if still valid or unknown
    """
    if not deadline:
        # If no deadline, assume it's not expired (e.g., rolling admission)
        return False

    # Normalize the deadline
    deadline_date = normalize_deadline(deadline)

    if not deadline_date:
        # Could not parse, assume not expired to be safe
        return False

    # Check if deadline has passed (with grace period)
    from datetime import timedelta
    cutoff_date = datetime.now().date() - timedelta(days=grace_days)

    return deadline_date < cutoff_date


def calculate_expiration_date(deadline: Optional[Union[str, date, datetime]],
                              grace_days: int = 30) -> Optional[datetime]:
    """
    Calculate when a scholarship should be marked as expired

    Args:
        deadline: The scholarship deadline
        grace_days: Days after deadline before marking as expired (default: 30)

    Returns:
        datetime when scholarship should expire, or None
    """
    if not deadline:
        return None

    deadline_date = normalize_deadline(deadline)

    if not deadline_date:
        return None

    from datetime import timedelta
    # Convert to datetime and add grace period
    expiration = datetime.combine(deadline_date, datetime.min.time()) + timedelta(days=grace_days)

    return expiration


def format_deadline(deadline: Optional[Union[str, date, datetime]],
                   format_str: str = "%Y-%m-%d") -> Optional[str]:
    """
    Format a deadline for display or storage

    Args:
        deadline: The deadline to format
        format_str: Python datetime format string (default: ISO format)

    Returns:
        Formatted date string or None
    """
    deadline_date = normalize_deadline(deadline)

    if not deadline_date:
        return None

    return deadline_date.strftime(format_str)


# Examples and test cases
if __name__ == "__main__":
    print("Testing date normalization...")

    test_cases = [
        "March 15",           # No year - should add current/next year
        "3/15",               # No year - numeric format
        "March 2025",         # Month and year only - should assume 1st
        "03/2025",            # Month/year numeric - should assume 1st
        "March 15, 2025",     # Full date
        "2025-03-15",         # ISO format
        "December 1",         # No year, far in future
        "January 5",          # No year, might be past
    ]

    for test in test_cases:
        normalized = normalize_deadline(test)
        expired = is_expired(test)
        expiration = calculate_expiration_date(test)

        print(f"\nInput: '{test}'")
        print(f"  Normalized: {normalized}")
        print(f"  Expired: {expired}")
        print(f"  Expires at: {expiration}")
