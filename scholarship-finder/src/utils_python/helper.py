"""
General helper utilities for scholarship scrapers.
"""

import re
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def normalize_deadline_value(value: Optional[str]) -> Optional[str]:
    """Normalize deadline value to YYYY-MM-DD format.
    
    Parameters:
        value: Raw deadline string.
        
    Returns:
        Normalized deadline string in YYYY-MM-DD format, or None.
    """
    if not value:
        return None

    text = value.strip()
    if not text:
        return None

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text

    lowered = text.lower()
    if any(keyword in lowered for keyword in ['rolling', 'varies', 'open', 'ongoing', 'continuous', 'not specified']):
        return None

    text = re.sub(r"(\d{1,2})(st|nd|rd|th)", r"\1", text, flags=re.IGNORECASE)

    current_year = datetime.now().year

    for fmt in ["%b %d", "%B %d", "%b %d, %Y", "%B %d, %Y"]:
        try:
            date_obj = datetime.strptime(text, fmt)
            if "%Y" not in fmt:
                date_obj = date_obj.replace(year=current_year)
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            continue

    match = re.match(r"^(?P<month>[A-Za-z]+)[\s/-]+(?P<day>\d{1,2})[\s/-]+(?P<year>\d{2,4})$", text)
    if match:
        try:
            month_str = match.group('month')
            day = int(match.group('day'))
            year = int(match.group('year'))
            if year < 100:
                year += 2000
            for fmt in ["%b", "%B"]:
                try:
                    month_number = datetime.strptime(month_str, fmt).month
                    date_obj = datetime(year, month_number, day)
                    return date_obj.strftime('%Y-%m-%d')
                except ValueError:
                    continue
        except ValueError:
            pass

    return None

