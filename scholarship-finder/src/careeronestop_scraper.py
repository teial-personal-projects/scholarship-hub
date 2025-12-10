#!/usr/bin/env python3
"""
CareerOneStop Scraper - Python Version
Scrapes scholarships from CareerOneStop.org using BeautifulSoup
"""

import os
import logging
import re
import requests
import time
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime
from .base_scraper import BaseScraper
from ..utils_python import Scholarship, ScrapingResult, ScrapingMetadata, normalize_deadline_value

logger = logging.getLogger(__name__)


class CareerOneStopScraper(BaseScraper):
    """CareerOneStop.org scraper using BeautifulSoup"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.base_url = "https://www.careeronestop.org"
        self.search_url = "https://www.careeronestop.org/Toolkit/Training/find-scholarships.aspx"
        self.session = requests.Session()
        
        # No longer using keyword-by-keyword approach - using efficient broad search
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def scrape(self) -> ScrapingResult:
        """Entry point: paginate, parse rows, and persist scholarships.

        Returns:
            `ScrapingResult` with totals, errors, and collected scholarships.
        """
        logger.info("Starting CareerOneStop scraping...")
        
        try:
            scholarships = []
            errors = []
            
            # Use efficient approach - search with broad terms
            logger.info("Using efficient broad search approach")
            
            page = 1
            max_pages = self.max_pages  # Centralized default, overridable per instance
            logger.info(f"Will scrape up to {max_pages} pages")
            
            while page <= max_pages:
                try:
                    logger.info(f"Scraping page {page}")
                    page_scholarships = self._scrape_page(page)
                    logger.info(f"Found {len(page_scholarships)} scholarships on page {page}, total so far: {len(scholarships) + len(page_scholarships)}")
                    scholarships.extend(page_scholarships)
                    
                    if not page_scholarships:
                        logger.info(f"No more scholarships found on page {page}, stopping pagination")
                        break
                    
                    page += 1
                    time.sleep(2)  # Be respectful to the server
                    
                except Exception as e:
                    error_msg = f"Error scraping page {page}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    break
            
            logger.info(f"Finished scraping. Total pages processed: {page - 1}, Total scholarships collected: {len(scholarships)}")
            
            # Remove duplicates
            logger.info(f"Total scholarships found before deduplication: {len(scholarships)}")
            unique_scholarships = self._remove_duplicates(scholarships)
            logger.info(f"Total unique scholarships after deduplication: {len(unique_scholarships)}")
            
            # Process and save scholarships
            inserted = 0
            updated = 0
            process_errors = []
            
            for scholarship in unique_scholarships:
                try:
                    if self.save_scholarship(scholarship):
                        inserted += 1
                    else:
                        updated += 1
                except Exception as e:
                    process_errors.append(f"Error saving scholarship {scholarship.title}: {str(e)}")
            
            errors.extend(process_errors)
            
            return ScrapingResult(
                success=True,
                scholarships=unique_scholarships,
                errors=errors,
                metadata={
                    'total_found': len(unique_scholarships),
                    'total_processed': len(unique_scholarships),
                    'total_inserted': inserted,
                    'total_updated': updated
                }
            )
            
        except Exception as e:
            error_msg = f"CareerOneStop scraper failed: {str(e)}"
            logger.error(error_msg)
            
            return ScrapingResult(
                success=False,
                scholarships=[],
                errors=[error_msg],
                metadata={
                    'total_found': 0,
                    'total_processed': 0,
                    'total_inserted': 0,
                    'total_updated': 0
                }
            )
    
    def _scrape_page(self, page: int) -> List[Scholarship]:
        """Scrape a single result page and map rows to scholarships.

        Parameters:
            page: One-based page index to fetch from CareerOneStop.

        Returns:
            A list of `Scholarship` domain objects for this page.
        """
        scholarships = []
        
        try:
            # Construct search URL with pagination
            params = {
                'keyword': 'scholarship',  # Use broad search term
                'curPage': page
            }
            
            response = self.session.get(self.search_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Store raw HTML
            self._store_raw_data(f"careeronestop_page_{page}.html", response.text, 'text/html')
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find scholarship listings - use table structure like TypeScript version
            scholarship_elements = soup.find_all('table')
            if not scholarship_elements:
                # Fallback to other selectors
                scholarship_elements = soup.find_all('div', class_='scholarship-item') or \
                                     soup.find_all('div', class_='result-item') or \
                                     soup.find_all('tr', class_='scholarship-row')
            
            # Parse table rows like TypeScript version
            for table in scholarship_elements:
                rows = table.find_all('tr')
                for row in rows:
                    try:
                        scholarship = self._parse_table_row(row)
                        if scholarship:
                            scholarships.append(scholarship)
                    except Exception as e:
                        logger.warning(f"Error parsing table row: {str(e)}")
                        continue
            
            logger.info(f"Found {len(scholarships)} scholarships on page {page}")
            
        except Exception as e:
            logger.error(f"Error scraping page {page}: {str(e)}")
        
        return scholarships
    
    def _parse_table_row(self, row) -> Optional[Scholarship]:
        """Parse a HTML table row into a `Scholarship` if valid.

        Parameters:
            row: BeautifulSoup element representing a scholarship table row.

        Returns:
            A `Scholarship` if parsed correctly; otherwise None.
        """
        try:
            cells = row.find_all('td')
            if len(cells) < 5:
                return None
            
            name_cell = cells[0]
            type_cell = cells[2]
            
            # Check if it's a scholarship
            award_type = type_cell.get_text(strip=True)
            if 'scholarship' not in award_type.lower():
                return None
            
            # Extract title from link
            link = name_cell.find('a')
            if not link:
                return None
            
            title = link.get_text(strip=True)
            if not title or title == 'Award Name':
                return None
            
            # Skip if title is just a number or amount (common extraction error)
            import re
            if re.match(r'^[\d,]+$', title.strip()) or re.match(r'^\$[\d,]+$', title.strip()):
                logger.warning(f"Skipping scholarship with numeric title: {title}")
                return None
            
            # Extract organization from name cell text
            organization_text = name_cell.get_text()
            import re
            org_match = re.search(r'Organization:\s*(.+?)(?:\n|<br>|Purposes:)', organization_text, re.IGNORECASE)
            organization = org_match.group(1).strip() if org_match else ''
            
            # Extract URL
            detail_link = link.get('href')
            full_url = ''
            if detail_link:
                full_url = urljoin(self.base_url, detail_link) if detail_link else ''
                logger.debug(f"Extracted detail_link: {detail_link}, full_url: {full_url}")
            else:
                logger.warning(f"No href found in link element")
            
            # Extract academic level
            import re
            
            clean_title = self._clean_text(title)
            clean_organization = self._clean_text(organization)
            
            # Create scholarship object (DB will auto-assign scholarship_id)
            # Note: deadline will be set from detail page only
            scholarship = Scholarship(
                title=clean_title[:200],
                organization=clean_organization,
                source_url=full_url,
                source="CareerOneStop",
                country="US",
                active=True,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            # Fetch detail page to get additional information
            if full_url:
                detail_data = self._fetch_detail_data(full_url)
                if detail_data:
                    # Check Award Type - only process if it's a Scholarship
                    award_type_raw = detail_data.get('award_type')
                    award_type = award_type_raw.strip() if isinstance(award_type_raw, str) else ''
                    if award_type and award_type.lower() != 'scholarship':
                        return None  # Skip grants and fellowships
                    
                    # Map Level of Study to academic_level
                    level_of_study = detail_data.get('level_of_study')
                    if level_of_study:
                        mapped_level = self._map_academic_level(level_of_study)
                        if mapped_level:
                            scholarship.academic_level = [mapped_level]
                    
                    # Extract Focus for subject_areas
                    focus = detail_data.get('focus')
                    if focus:
                        subject_areas = self._parse_focus_to_subject_areas(focus)
                        if subject_areas:
                            scholarship.subject_areas = subject_areas
                    
                    # Determine target_type (merit if "merit" is in scholarship name)
                    target_type = self._determine_target_type(clean_title)
                    if target_type:
                        scholarship.target_type = target_type
                    
                    # Update other fields from detail page
                    if detail_data.get('deadline'):
                        detail_deadline = self._clean_text(detail_data['deadline'])
                        normalized_deadline = normalize_deadline_value(detail_deadline)
                        if normalized_deadline:
                            scholarship.deadline = normalized_deadline
                    
                    # Parse Funds field for min_award and max_award
                    # If two values found in Funds, first is min_award and second is max_award
                    if detail_data.get('min_award') is not None:
                        scholarship.min_award = detail_data['min_award']
                    if detail_data.get('max_award') is not None:
                        scholarship.max_award = detail_data['max_award']
                    
                    if detail_data.get('purpose'):
                        purpose = self._clean_text(detail_data['purpose'])
                        if purpose:
                            scholarship.description = purpose[:500]
                    
                    if detail_data.get('qualifications'):
                        qualifications = self._clean_text(detail_data['qualifications'])
                        if qualifications:
                            # Parse qualifications to extract specific fields
                            parsed_qualifications = self._parse_qualifications(qualifications)
                            
                            # Set min_gpa if found
                            if parsed_qualifications.get('min_gpa') is not None:
                                scholarship.min_gpa = parsed_qualifications['min_gpa']
                            
                            # Set ethnicity if found
                            if parsed_qualifications.get('ethnicity'):
                                scholarship.ethnicity = parsed_qualifications['ethnicity']
                            
                            # Set target_type if financial need found
                            if parsed_qualifications.get('financial_need'):
                                scholarship.target_type = 'need'
                            
                            # Build eligibility list from parsed qualifications
                            eligibility_entries = []
                            
                            # Add college/university attendance requirement to eligibility
                            if parsed_qualifications.get('college_requirement'):
                                eligibility_entries.append(parsed_qualifications['college_requirement'].lower())
                            
                            # Add other eligibility items (everything except GPA and college requirement)
                            if parsed_qualifications.get('other_eligibility'):
                                eligibility_entries.extend([item.lower() for item in parsed_qualifications['other_eligibility']])
                            
                            # If we have any eligibility items, set them
                            if eligibility_entries:
                                scholarship.eligibility = eligibility_entries
                    
                    # Check "To Apply" field for recommendation requirement
                    if detail_data.get('to_apply'):
                        to_apply_text = detail_data['to_apply'].lower()
                        if 'recommendation' in to_apply_text:
                            scholarship.recommendation_required = True
                    
                    # Set apply_url from "For more information" field
                    if detail_data.get('for_more_information'):
                        for_more_info = detail_data['for_more_information']
                        # Check if it's already a URL (starts with http)
                        if for_more_info.startswith('http://') or for_more_info.startswith('https://'):
                            scholarship.apply_url = for_more_info
                        else:
                            # Extract URL from the text if it contains a URL
                            url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
                            url_match = re.search(url_pattern, for_more_info)
                            if url_match:
                                scholarship.apply_url = url_match.group(0)
                else:
                    logger.warning(f"No detail data returned for: {full_url}")
            
            return scholarship
            
        except Exception as e:
            logger.error(f"Error parsing table row: {str(e)}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing extra whitespace and quotes"""
        if not text:
            return ""
        # Remove extra whitespace
        text = ' '.join(text.split())
        # Remove quotes if they wrap the entire text
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        if text.startswith("'") and text.endswith("'"):
            text = text[1:-1]
        return text
    
    def _clean_extracted_value(self, value: str) -> str:
        """Clean extracted detail value by stripping whitespace and removing trailing period.
        
        Parameters:
            value: Raw extracted value string.
            
        Returns:
            Cleaned value string with trailing period removed.
        """
        cleaned_value = value.strip()
        # Remove trailing period if present
        if cleaned_value.endswith('.'):
            cleaned_value = cleaned_value[:-1]
        return cleaned_value
    
    def _extract_text(self, element, selectors: List[str]) -> Optional[str]:
        """Extract text using multiple possible selectors"""
        for selector in selectors:
            found = element.select_one(selector)
            if found:
                text = found.get_text(strip=True)
                if text:
                    return text
        return None
    
    def _extract_url(self, element) -> Optional[str]:
        """Extract URL from element"""
        # Look for links
        link = element.find('a')
        if link and link.get('href'):
            href = link.get('href')
            if href.startswith('http'):
                return href
            else:
                return urljoin(self.base_url, href)
        return None
    
    def _parse_amount(self, amount_text: Optional[str]) -> tuple[Optional[float], Optional[float]]:
        """Parse amount text to extract min and max awards"""
        if not amount_text:
            return None, None
        
        try:
            # Remove common text and extract numbers
            import re
            numbers = re.findall(r'\$?([\d,]+)', amount_text.replace(',', ''))
            
            if len(numbers) >= 2:
                # Assume first is min, second is max
                return float(numbers[0]), float(numbers[1])
            elif len(numbers) == 1:
                # Single amount
                amount = float(numbers[0])
                return amount, amount
            else:
                return None, None
        except:
            return None, None
    
    
    
    def _remove_duplicates(self, scholarships: List[Scholarship]) -> List[Scholarship]:
        """Remove in-batch duplicates on (title, organization) heuristic.

        Parameters:
            scholarships: Collection potentially containing duplicates.

        Returns:
            A list with duplicate titles for the same organization removed.
        """
        seen = set()
        unique = []
        duplicates_count = 0
        
        for scholarship in scholarships:
            key = f"{scholarship.title.lower()}-{scholarship.organization.lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(scholarship)
            else:
                duplicates_count += 1
                logger.debug(f"Duplicate found: {scholarship.title} - {scholarship.organization}")
        
        if duplicates_count > 0:
            logger.info(f"Removed {duplicates_count} duplicate scholarships")
        
        return unique
    
    def _store_raw_data(self, filename: str, content: str, content_type: str):
        """Store raw data (placeholder for S3 storage)"""
        # In a real implementation, this would store to S3
        # For now, just log that we would store it
        logger.debug(f"Would store raw data: {filename} ({len(content)} bytes)")
    
    def _set_awards(self, funds: str, detail_data: Dict[str, Any]):
        """Parse Funds field and set min_award and max_award in detail_data.
        
        Parameters:
            funds: Raw funds text from detail page.
            detail_data: Dictionary to update with min_award and max_award.
        """
        if not funds:
            return
        
        # Parse Funds field - values may be on separate lines
        # Clean the text and split by newlines to handle multi-line values
        funds_cleaned = self._clean_text(funds)
        # Split by newlines, carriage returns, or other separators (but not commas within numbers)
        # Use lookahead/lookbehind to avoid splitting on commas within numbers
        funds_lines = re.split(r'[\n\r]+|\s+-\s+|(?<!\d),(?!\d)', funds_cleaned)
        
        # Extract all dollar amounts from all lines
        amounts = []
        for line in funds_lines:
            # Extract dollar amounts from each line
            line_amounts = re.findall(r'\$?\s*([\d,]+)', line)
            for amount_str in line_amounts:
                try:
                    amount = float(amount_str.replace(',', ''))
                    amounts.append(amount)
                except ValueError:
                    continue
        
        # If two values found, first is min_award and second is max_award
        # If one value found, both min and max are set to that value
        if len(amounts) >= 2:
            detail_data['min_award'] = amounts[0]
            detail_data['max_award'] = amounts[1]
        elif len(amounts) == 1:
            detail_data['min_award'] = amounts[0]
            detail_data['max_award'] = amounts[0]
    
    def _fetch_detail_data(self, detail_url: str) -> Dict[str, Any]:
        """Fetch and parse detail page for a scholarship.
        
        Parameters:
            detail_url: URL of the scholarship detail page.
            
        Returns:
            Dictionary with extracted detail data.
        """
        if not detail_url:
            return {}
        
        try:
            time.sleep(1)  # Be respectful to the server
            logger.debug(f"Fetching URL: {detail_url}")
            response = self.session.get(detail_url, timeout=30)
            response.raise_for_status()
            logger.debug(f"Response status: {response.status_code}, length: {len(response.text)}")
            
            sanitized = self._sanitize_filename(detail_url)
            self._store_raw_data(f"careeronestop_detail_{sanitized}.html", response.text, 'text/html')
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Parse all bold labels once at the start for efficiency
            self.bold_label_map = self._parse_bold_labels(soup)
            
            detail_data: Dict[str, Any] = {}
            
            # Extract organization from first line (usually appears first in the detail page)
            # Look for organization field
            detail_data['organization'] = self._extract_detail_value(soup, ['Organization'])
            
            # Extract Level of Study
            detail_data['level_of_study'] = self._extract_detail_value(soup, ['Level of Study'])
            
            # Extract Award Type - critical for filtering
            detail_data['award_type'] = self._extract_detail_value(soup, ['Award Type'])
            
            # Extract Focus for subject_areas
            detail_data['focus'] = self._extract_detail_value(soup, ['Focus'])
            
            # Extract Purpose
            detail_data['purpose'] = self._extract_detail_value(soup, ['Purpose'])
            
            # Extract Qualifications
            detail_data['qualifications'] = self._extract_detail_value(soup, ['Criteria'])
            
            # Extract "To Apply" field
            detail_data['to_apply'] = self._extract_detail_value(soup, ['To Apply'])
            
            # Extract "For more information" for apply_url
            for_more_info = self._extract_detail_value(soup, ['For more information'])
            # Also try to extract a link from that section
            if for_more_info:
                detail_data['for_more_information'] = for_more_info
            else:
                # Try to find a link near "For more information" text
                for_more_link = self._extract_link_near_label(soup, ['For more information', 'For More Information'], detail_url)
                if for_more_link:
                    detail_data['for_more_information'] = for_more_link
            
            # Extract Deadline
            detail_data['deadline'] = self._extract_detail_value(soup, ['Deadline'])
            
            # Extract Funds (award amount) if not already found
            funds = self._extract_detail_value(soup, ['Funds'])
            if funds:
                self._set_awards(funds, detail_data)
            
            logger.debug(f"Extracted detail data keys: {list(detail_data.keys())}")
            logger.debug(f"Detail data values: {detail_data}")
            return detail_data
            
        except Exception as e:
            logger.warning(f"Failed to fetch detail data for {detail_url}: {e}")
            return {}
    
    def _parse_bold_labels(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Parse all bold/strong tags that contain labels and their corresponding values.
        
        Parameters:
            soup: BeautifulSoup object of the detail page.
            
        Returns:
            Dictionary mapping label names (lowercase) to their values.
        """
        label_value_map: Dict[str, str] = {}
        
        # Find all bold/strong tags that might be labels
        for bold in soup.find_all(['b', 'strong']):
            bold_text = bold.get_text(strip=True)
            if not bold_text:
                continue
            
            # Try to extract the value from the next td
            value = self._extract_value_from_match(bold)
            if value:
                cleaned_value = self._clean_extracted_value(value)
                # Store with lowercase label for case-insensitive lookup
                label_value_map[bold_text.lower()] = cleaned_value
        
        return label_value_map
    
    def _extract_detail_value(self, soup: BeautifulSoup, labels: List[str]) -> Optional[str]:
        """Extract a value from detail page by matching labels.
        
        Parameters:
            soup: BeautifulSoup object of the detail page.
            labels: List of possible label names to search for.
            
        Returns:
            Extracted value string or None.
        """
        import re
        from bs4.element import Tag, NavigableString
        
        # First check pre-parsed bold label map if available
        if hasattr(self, 'bold_label_map') and self.bold_label_map:
            for label in labels:
                label_lower = label.lower()
                if label_lower in self.bold_label_map:
                    value = self.bold_label_map[label_lower]
                    logger.debug(f"Found {label} via bold label map: {value}")
                    return value
        
        # Fallback: search in text nodes and bold tags (for backwards compatibility)
        for label in labels:
            # Try to find the label text
            label_pattern = re.compile(rf'^\s*{re.escape(label)}', re.IGNORECASE)
            
            # Search in all text nodes
            for element in soup.find_all(string=label_pattern):
                value = self._extract_value_from_match(element)
                if value:
                    cleaned_value = self._clean_extracted_value(value)
                    logger.debug(f"Found {label} via text node: {cleaned_value}")
                    return cleaned_value
            
            # Search in bold/strong tags for this specific label (if not using pre-parsed map)
            if not (hasattr(self, 'bold_label_map') and self.bold_label_map):
                for bold in soup.find_all(['b', 'strong']):
                    bold_text = bold.get_text(strip=True)
                    if label_pattern.match(bold_text):
                        value = self._extract_value_from_match(bold)
                        if value:
                            cleaned_value = self._clean_extracted_value(value)
                            logger.debug(f"Found {label} via bold tag: {cleaned_value}")
                            return cleaned_value
        
        logger.debug(f"Could not find label: {labels}")
        return None
    
    def _extract_link_near_label(self, soup: BeautifulSoup, labels: List[str], base_url: str) -> Optional[str]:
        """Extract a link near a label text.
        
        Parameters:
            soup: BeautifulSoup object of the detail page.
            labels: List of possible label names to search for.
            base_url: Base URL for resolving relative URLs.
            
        Returns:
            Extracted URL string or None.
        """
        for label in labels:
            # Try to find the label text
            label_pattern = re.compile(rf'^\s*{re.escape(label)}', re.IGNORECASE)
            
            # Search in all text nodes
            for element in soup.find_all(string=label_pattern):
                parent = element.parent if hasattr(element, 'parent') else None
                
                # Look for links in the same parent or nearby siblings
                if parent:
                    # Check parent for links
                    link = parent.find('a', href=True)
                    if link:
                        href = link.get('href')
                        if href:
                            return urljoin(base_url, href) if not href.startswith('http') else href
                    
                    # Check next siblings for links
                    for sibling in parent.next_siblings:
                        if hasattr(sibling, 'find'):
                            link = sibling.find('a', href=True)
                            if link:
                                href = link.get('href')
                                if href:
                                    return urljoin(base_url, href) if not href.startswith('http') else href
                        
                        # Also check if sibling itself is a link
                        if hasattr(sibling, 'get') and sibling.name == 'a':
                            href = sibling.get('href')
                            if href:
                                return urljoin(base_url, href) if not href.startswith('http') else href
        
        return None
    
    def _extract_value_from_match(self, match: Any) -> Optional[str]:
        """Extract value from a matched element.
        
        Parameters:
            match: BeautifulSoup element or string that matched a label.
            
        Returns:
            Extracted value or None.
        """
        from bs4.element import Tag, NavigableString
        
        # If it's a NavigableString, check parent
        if isinstance(match, NavigableString):
            parent = match.parent
        else:
            parent = match
        
        if not isinstance(parent, Tag):
            return None
        
        # Try to find value after colon in same element
        parent_text = parent.get_text(' ', strip=True)
        if ':' in parent_text:
            parts = parent_text.split(':', 1)
            if len(parts) > 1:
                value = parts[1].strip()
                if value:
                    return value
        
        # Try next sibling
        next_sibling = parent.next_sibling
        while next_sibling:
            if isinstance(next_sibling, NavigableString):
                value = str(next_sibling).strip()
                if value:
                    return value
            elif isinstance(next_sibling, Tag):
                value = next_sibling.get_text(' ', strip=True)
                if value:
                    return value
            next_sibling = next_sibling.next_sibling
        
        # Try next element in document
        for next_elem in parent.next_siblings:
            if isinstance(next_elem, Tag):
                text = next_elem.get_text(' ', strip=True)
                if text:
                    return text
        
        # Try table cell (td) parent approach - if parent is a td, look for next td
        td_parent = parent.find_parent('td')
        if td_parent and td_parent.name == 'td':
            next_td = td_parent.find_next_sibling('td')
            if next_td:
                # Check if this is the Organization field - get only first div if present
                if parent.name == 'strong' and parent.get_text(strip=True).lower() == 'organization':
                    first_div = next_td.find('div')
                    if first_div:
                        value = first_div.get_text(' ', strip=True)
                        if value:
                            logger.debug(f"Found organization in first div: {value[:100]}")
                            return value
                
                # For all other fields, get all text from td
                value = next_td.get_text(' ', strip=True)
                if value:
                    logger.debug(f"Found value in next td: {value[:100]}")
                    return value
        
        return None
    
    def _map_academic_level(self, level_of_study: str) -> Optional[str]:
        """Map Level of Study to standardized academic_level values.
        
        Parameters:
            level_of_study: Raw level of study string from detail page.
            
        Returns:
            Mapped academic level or None if should be ignored.
        """
        if not level_of_study:
            return None
        
        level_lower = level_of_study.strip().lower()
        
        # Map according to requirements
        if 'associates degree' in level_lower:
            return 'associates'
        elif "bachelor's degree" in level_lower or 'bachelors degree' in level_lower:
            return 'undergraduate'
        elif 'graduate degree' in level_lower:
            return 'graduate'
        elif 'high school' in level_lower:
            return 'high school'
        else:
            # Ignore all other values
            return None
    
    def _parse_focus_to_subject_areas(self, focus: str) -> Optional[List[str]]:
        """Parse Focus field into subject_areas array.
        
        Parameters:
            focus: Focus field value from detail page.
            
        Returns:
            List of subject area strings, or None if empty.
        """
        if not focus:
            return None
        
        # Clean and split focus text
        focus_cleaned = self._clean_text(focus)
        
        # Check if the entire focus field is "General studies/Field of study not specified"
        focus_lower = focus_cleaned.lower()
        if 'general studies/field of study not specified' in focus_lower or focus_lower == 'general studies/field of study not specified':
            return None
        
        # Split by common delimiters (comma, semicolon, slash, etc.)
        import re
        areas = re.split(r'[,;/]|\sand\s', focus_cleaned)
        
        # Clean each area and filter empty ones
        subject_areas = []
        for area in areas:
            cleaned = area.strip().lower()
            # Remove trailing period if present
            if cleaned.endswith('.'):
                cleaned = cleaned[:-1]
            if cleaned and cleaned not in ['general studies', 'field of study not specified', 'general studies/field of study not specified']:
                subject_areas.append(cleaned)
        
        return subject_areas if subject_areas else None
    
    def _parse_qualifications(self, qualifications: str) -> Dict[str, Any]:
        """Parse qualifications text to extract specific fields.
        
        Parameters:
            qualifications: Raw qualifications text from detail page.
            
        Returns:
            Dictionary with extracted fields:
            - min_gpa: Optional[float] - Minimum GPA if found
            - college_requirement: Optional[str] - College/university attendance requirement
        """
        result: Dict[str, Any] = {
            'min_gpa': None,
            'college_requirement': None,
            'ethnicity': None,
            'financial_need': None,
        }
        
        if not qualifications:
            return result
        
        qualifications_lower = qualifications.lower()
        
        # Extract GPA requirement: "must have a minimum GPA of x.y or higher"
        gpa_pattern = r'must have a minimum gpa of ([\d.]+)\s*(?:or higher|or above|or more)?'
        gpa_match = re.search(gpa_pattern, qualifications_lower)
        if not gpa_match:
            # Try alternative patterns
            gpa_patterns = [
                r'minimum gpa of ([\d.]+)',
                r'gpa of ([\d.]+)\s*(?:or higher|or above|or more)',
                r'gpa\s*[:\-]?\s*([\d.]+)\s*(?:or higher|or above|or more)',
            ]
            for pattern in gpa_patterns:
                gpa_match = re.search(pattern, qualifications_lower)
                if gpa_match:
                    break
        
        if gpa_match:
            try:
                gpa_value = float(gpa_match.group(1))
                result['min_gpa'] = gpa_value
            except (ValueError, IndexError):
                pass
        
        # Extract college/university attendance requirement
        # Pattern: "must be attending [name] college or university" (name can be quoted)
        # Try exact match first with potential quotes around college name
        college_patterns = [
            r'must be attending\s+["\']?([^"\']+?)["\']?\s+college or university',  # Handles quoted names
            r'must be attending\s+([^\.]+?)\s+college or university',  # Handles unquoted names
            r'must be enrolled at\s+["\']?([^"\']+?)["\']?\s+(?:college|university)',
            r'must attend\s+["\']?([^"\']+?)["\']?\s+(?:college|university)',
        ]
        
        college_match = None
        for pattern in college_patterns:
            college_match = re.search(pattern, qualifications_lower)
            if college_match:
                break
        
        if college_match:
            college_name = college_match.group(1).strip()
            if college_name:
                # Reconstruct the full requirement text in original case if possible
                # Try to find the original case from the original text
                original_pattern = r'must be attending\s+["\']?([^"\']+?)["\']?\s+college or university'
                original_match = re.search(original_pattern, qualifications, re.IGNORECASE)
                if original_match:
                    result['college_requirement'] = original_match.group(0)
                else:
                    result['college_requirement'] = f"must be attending {college_name} college or university"
        
        qualifications_text = qualifications
        
        # Remove GPA requirement from text if found
        if gpa_match:
            # Find the original case version of the GPA requirement
            gpa_text = gpa_match.group(0)
            qualifications_text = re.sub(re.escape(gpa_text), '', qualifications_text, flags=re.IGNORECASE)
        
        # Remove college requirement from text if found
        if result['college_requirement']:
            college_text = result['college_requirement']
            qualifications_text = re.sub(re.escape(college_text), '', qualifications_text, flags=re.IGNORECASE)
        
        # Extract ethnicity keywords
        if 'asian american' in qualifications_lower:
            result['ethnicity'] = ['asian']
        elif 'hispanic american' in qualifications_lower:
            result['ethnicity'] = ['hispanic']
        elif 'african american' in qualifications_lower:
            result['ethnicity'] = ['african american']
        elif 'native american' in qualifications_lower:
            result['ethnicity'] = ['native american']
        else:
            # Check for other ethnicities
            other_ethnicity_keywords = [
                'latinx',
                'latino',
                'latina',
                'pacific islander',
                'alaskan native',
                'american indian',
            ]
            
            for keyword in other_ethnicity_keywords:
                if keyword in qualifications_lower:
                    result['ethnicity'] = [keyword]
                    break
        
        # Check for financial need
        if 'financial need' in qualifications_lower:
            result['financial_need'] = True
        
        return result
    
    def _determine_target_type(self, scholarship_title: str) -> Optional[str]:
        """Determine target_type based on scholarship name.
        
        Parameters:
            scholarship_title: The title/name of the scholarship.
            
        Returns:
            'merit' if "merit" is in the name, None otherwise.
        """
        if not scholarship_title:
            return None
        
        # Check if "merit" is in the scholarship name
        if 'merit' in scholarship_title.lower():
            return 'merit'
        
        # Otherwise leave blank (return None)
        return None
    
    def _sanitize_filename(self, url: str) -> str:
        """Sanitize URL for use in filename.
        
        Parameters:
            url: URL string.
            
        Returns:
            Sanitized filename string.
        """
        import re
        parsed = urlparse(url)
        path = parsed.path.strip('/') or 'scholarship'
        path = path.replace('/', '_')
        if parsed.query:
            path = f"{path}_{parsed.query.replace('=', '-').replace('&', '_')}"
        sanitized = re.sub(r'[^A-Za-z0-9_.-]', '_', path)
        return sanitized[:200]
