#!/usr/bin/env python3
"""
CollegeScholarship Scraper - Python Version
Scrapes scholarships from CollegeScholarships.org using BeautifulSoup
"""

import logging
import re
import requests
import time
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from bs4.element import Tag, NavigableString
from urllib.parse import urljoin, urlparse
from datetime import datetime
from .base_scraper import BaseScraper
from ..utils_python import Scholarship, ScrapingResult, ScrapingMetadata, normalize_deadline_value

logger = logging.getLogger(__name__)


class CollegeScholarshipScraper(BaseScraper):
    """CollegeScholarships.org scraper using BeautifulSoup"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.base_url = "https://www.collegescholarships.org"
        self.search_url = "https://www.collegescholarships.org/financial-aid/"
        self.session = requests.Session()
        

        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def scrape(self) -> ScrapingResult:
        """Entry point: paginate list pages, parse items, persist results.

        Returns:
            `ScrapingResult` with totals, errors, and collected scholarships.
        """
        logger.info("Starting CollegeScholarship scraping...")
        
        try:
            # Update job status
            self.update_job_status('running', ScrapingMetadata())
            
            scholarships = []
            errors = []
            
            page = 1
            max_pages = self.max_pages  # Centralized default, overridable per instance
            
            while page <= max_pages:
                try:
                    logger.info(f"Scraping page {page}")
                    page_scholarships = self._scrape_page(page)
                    scholarships.extend(page_scholarships)
                    
                    if not page_scholarships:
                        logger.info(f"No more scholarships found on page {page}")
                        break
                    
                    page += 1
                    time.sleep(3)  # Be respectful to the server
                    
                except Exception as e:
                    error_msg = f"Error scraping page {page}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    break
            
            # Remove duplicates
            unique_scholarships = self._remove_duplicates(scholarships)
            
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
            
            # Update job status
            self.update_job_status('completed', ScrapingMetadata(
                records_found=len(unique_scholarships),
                records_processed=len(unique_scholarships),
                records_inserted=inserted,
                records_updated=updated
            ))
            
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
            error_msg = f"CollegeScholarship scraper failed: {str(e)}"
            logger.error(error_msg)
            
            self.update_job_status('failed', ScrapingMetadata(errors=[error_msg]))
            
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
        """Scrape a single page from CollegeScholarships.org listings.

        Parameters:
            page: One-based page index. Page 1 uses the base search URL.

        Returns:
            A list of `Scholarship` domain objects for this page.
        """
        scholarships = []
        
        try:
            # Construct search URL with pagination
            if page == 1:
                url = self.search_url
            else:
                url = f"{self.search_url}?page={page}"
            
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # Store raw HTML
            self._store_raw_data(f"collegescholarship_page_{page}.html", response.text, 'text/html')
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find scholarship listings using TypeScript structure
            scholarship_elements = soup.find_all('div', class_='row')
            
            for element in scholarship_elements:
                try:
                    scholarship = self._parse_row_element(element)
                    if scholarship:
                        scholarships.append(scholarship)
                except Exception as e:
                    logger.warning(f"Error parsing row element: {str(e)}")
                    continue
            
            logger.info(f"Found {len(scholarships)} scholarships on page {page}")
            
        except Exception as e:
            logger.error(f"Error scraping page {page}: {str(e)}")
        
        return scholarships
    
    def _parse_row_element(self, element) -> Optional[Scholarship]:
        """Parse a listing row element into a `Scholarship` if valid.

        Parameters:
            element: BeautifulSoup element representing a scholarship row.

        Returns:
            A `Scholarship` if parsed correctly; otherwise None.
        """
        try:
            # Find scholarship summary and description sections
            summary = element.find('div', class_='scholarship-summary')
            description = element.find('div', class_='scholarship-description')
            
            if not summary or not description:
                return None
            
            # Extract amount from summary
            amount_element = summary.find('div', class_='lead')
            if amount_element:
                amount_text = amount_element.find('strong')
                amount = amount_text.get_text(strip=True) if amount_text else 'Amount varies'
            else:
                amount = 'Amount varies'
            
            min_award, max_award = self._parse_amount(amount)
            
            # Extract deadline from summary
            deadline_element = summary.find_all('p')[-1] if summary.find_all('p') else None
            if deadline_element:
                deadline_strong = deadline_element.find('strong')
                raw_deadline = deadline_strong.get_text(strip=True) if deadline_strong else 'No deadline specified'
            else:
                raw_deadline = 'No deadline specified'
            
            # Extract title and link from description
            title_element = description.find('h4')
            if title_element:
                link_element = title_element.find('a')
                if link_element:
                    title = link_element.get_text(strip=True)
                    link = link_element.get('href')
                else:
                    title = title_element.get_text(strip=True)
                    link = ''
            else:
                return None
            
            # Skip if title contains 'Find Scholarships'
            if 'Find Scholarships' in title:
                return None
            
            # Skip if title is just a number or amount (common extraction error)
            if re.match(r'^[\d,]+$', title.strip()) or re.match(r'^\$[\d,]+$', title.strip()):
                logger.warning(f"Skipping scholarship with numeric title: {title}")
                return None
            
            # Extract description from description section
            desc_paragraphs = description.find_all('p', class_=lambda x: x != 'visible-xs')
            description_text = ''
            if desc_paragraphs:
                description_text = desc_paragraphs[0].get_text(strip=True)
            
            # Extract eligibility items from ul.fa-ul li
            eligibility_items = []
            academic_level_items = []
            geographic_restrictions_items = []
            
            ul_element = description.find('ul', class_='fa-ul')
            if ul_element:
                for li in ul_element.find_all('li'):
                    icon = li.find('i')
                    if icon:
                        icon_classes = icon.get('class', [])
                        text_element = li.find(class_='trim')
                        if text_element:
                            text = text_element.get_text(strip=True)
                            if text and 'No Geographic Restrictions' not in text:
                                if 'fa-map-marker' in icon_classes:
                                    geographic_restrictions_items.append(text)
                                elif 'fa-graduation-cap' in icon_classes:
                                    academic_level_items.append(text)
                                else:
                                    eligibility_items.append(text)
            
            eligibility_entries: List[str] = []
            for item in eligibility_items:
                normalized_item = self._normalize_eligibility_text(self._clean_text(item))
                if normalized_item:
                    normalized_lower = normalized_item.lower()
                    # Exclude "all majors eligible"
                    if normalized_lower != 'all majors eligible':
                        eligibility_entries.append(normalized_lower)

            academic_level_entries: List[str] = []
            for item in academic_level_items:
                normalized_item = self._normalize_eligibility_text(self._clean_text(item))
                if normalized_item:
                    cleaned_item = normalized_item.lower()
                    if cleaned_item not in ('degree', 'study'):
                        academic_level_entries.append(cleaned_item)

            geo_entries: List[str] = []
            for item in geographic_restrictions_items:
                normalized_item = self._clean_text(item)
                if normalized_item:
                    geo_entries.append(normalized_item.lower())
            
            # Clean text like TypeScript version
            clean_title = self._clean_text(title)
            clean_deadline = self._clean_text(raw_deadline)
            normalized_deadline = normalize_deadline_value(clean_deadline)
            if normalized_deadline:
                clean_deadline = normalized_deadline
            clean_description = self._clean_text(description_text)
            detail_url = urljoin(self.base_url, link) if link else ""
            
            # Check description for "financial need" to set target_type
            target_type = None
            if clean_description and 'financial need' in clean_description.lower():
                target_type = 'need'
            
            # Extract GPA from description (e.g., "minimum x.y GPA")
            min_gpa = None
            if clean_description:
                min_gpa = self._extract_gpa_from_text(clean_description)
            
            # Create scholarship object (let DB auto-increment scholarship_id)
            scholarship = Scholarship(
                title=clean_title[:200],
                description=clean_description[:500] if clean_description else None,
                organization="",
                source_url=detail_url,
                source="CollegeScholarships",
                country="US",
                active=True,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                min_award=min_award,
                max_award=max_award,
                deadline=clean_deadline,
                eligibility=eligibility_entries if eligibility_entries else None,
                academic_level=academic_level_entries if academic_level_entries else None,
                geographic_restrictions=geo_entries if geo_entries else None,
                target_type=target_type,
                min_gpa=min_gpa
            )

            # the detailed url takes you to a page with more details about the scholarship
            if detail_url:
                detail_data = self._fetch_detail_data(detail_url)
            else:
                detail_data = {}

            if detail_data:
                if detail_data.get('deadline'):
                    detail_deadline = self._clean_text(detail_data['deadline'])
                    normalized_detail_deadline = normalize_deadline_value(detail_deadline)
                    if normalized_detail_deadline:
                        scholarship.deadline = normalized_detail_deadline
                    elif detail_deadline:
                        scholarship.deadline = detail_deadline

                if detail_data.get('min_award') is not None:
                    scholarship.min_award = detail_data['min_award']

                if detail_data.get('max_award') is not None:
                    scholarship.max_award = detail_data['max_award']

                if detail_data.get('renewable') is not None:
                    scholarship.renewable = detail_data['renewable']

                if detail_data.get('ethnicity'):
                    ethnicity_value = self._clean_text(detail_data['ethnicity'])
                    if ethnicity_value:
                        normalized_ethnicity = ethnicity_value.lower()
                        scholarship.ethnicity = [normalized_ethnicity]

                if detail_data.get('organization'):
                    scholarship.organization = self._clean_text(detail_data['organization'])[:255]

                if detail_data.get('apply_url'):
                    scholarship.apply_url = detail_data['apply_url']

                # Map Enrollment level to academic_level
                if detail_data.get('enrollment_level'):
                    enrollment_level = self._clean_text(detail_data['enrollment_level'])
                    if enrollment_level:
                        mapped_level = self._map_enrollment_level(enrollment_level)
                        if mapped_level:
                            existing_academic = scholarship.academic_level or []
                            combined_academic = []
                            for entry in existing_academic + [mapped_level]:
                                if entry and entry not in combined_academic:
                                    combined_academic.append(entry)
                            scholarship.academic_level = combined_academic if combined_academic else None
                
                # Parse Major field for subject_areas
                if detail_data.get('major'):
                    major = self._clean_text(detail_data['major'])
                    if major:
                        subject_areas = self._parse_major_to_subject_areas(major)
                        if subject_areas:
                            scholarship.subject_areas = subject_areas

                if detail_data.get('eligibility_notes'):
                    extra_notes: List[str] = []
                    for note in detail_data['eligibility_notes']:
                        normalized_note = self._normalize_eligibility_text(self._clean_text(note))
                        if normalized_note:
                            normalized_lower = normalized_note.lower()
                            # Exclude "all majors eligible"
                            if normalized_lower != 'all majors eligible':
                                extra_notes.append(normalized_lower)

                    if extra_notes:
                        existing = scholarship.eligibility or []
                        combined: List[str] = []
                        for entry in existing + extra_notes:
                            if entry and entry not in combined:
                                combined.append(entry)
                        scholarship.eligibility = combined if combined else None

                if detail_data.get('min_gpa') is not None:
                    scholarship.min_gpa = detail_data['min_gpa']
                
                # Check final description for "financial need" to set target_type
                # (in case description was updated from detail page)
                if scholarship.description and 'financial need' in scholarship.description.lower():
                    scholarship.target_type = 'need'
                
                # Check Purpose field for "financial Need" (with capital N)
                if detail_data.get('purpose'):
                    purpose_text = detail_data['purpose']
                    if 'financial Need' in purpose_text or 'financial need' in purpose_text.lower():
                        scholarship.target_type = 'need'
                
                # Check To Apply field for "financial Need" (with capital N)
                if detail_data.get('to_apply'):
                    to_apply_text = detail_data['to_apply']
                    if 'financial Need' in to_apply_text or 'financial need' in to_apply_text.lower():
                        scholarship.target_type = 'need'
                
                # Extract GPA from final description if not already set
                # (in case description was updated from detail page)
                if scholarship.min_gpa is None and scholarship.description:
                    extracted_gpa = self._extract_gpa_from_text(scholarship.description)
                    if extracted_gpa is not None:
                        scholarship.min_gpa = extracted_gpa
            
            return scholarship
            
        except Exception as e:
            logger.error(f"Error parsing row element: {str(e)}")
            return None

    def _fetch_detail_data(self, detail_url: str) -> Dict[str, Any]:
        if not detail_url:
            return {}

        try:
            time.sleep(1)
            response = self.session.get(detail_url, timeout=30)
            response.raise_for_status()

            sanitized = self._sanitize_filename(detail_url)
            self._store_raw_data(f"collegescholarship_detail_{sanitized}.html", response.text, 'text/html')

            soup = BeautifulSoup(response.text, 'html.parser')

            detail_data: Dict[str, Any] = {}

            detail_data['apply_url'] = self._extract_apply_link(soup, detail_url)
            detail_data['deadline'] = self._extract_detail_value(soup, ['Deadline'])

            min_award_text = self._extract_detail_value(soup, ['Min. award', 'Min award'])
            max_award_text = self._extract_detail_value(soup, ['Max. award', 'Max award'])

            detail_data['min_award'] = self._parse_currency_value(min_award_text)
            detail_data['max_award'] = self._parse_currency_value(max_award_text)

            renewable_text = self._extract_detail_value(soup, ['Renewable'])
            detail_data['renewable'] = self._parse_boolean_value(renewable_text)

            race_value = self._extract_detail_value(soup, ['Race'])
            if race_value:
                cleaned_race = self._clean_text(race_value).lower()
            else:
                cleaned_race = None

            detail_data['ethnicity'] = cleaned_race
            detail_data['enrollment_level'] = self._extract_detail_value(soup, ['Enrollment level'])
            detail_data['major'] = self._extract_detail_value(soup, ['Major'])
            detail_data['purpose'] = self._extract_detail_value(soup, ['Purpose'])
            detail_data['to_apply'] = self._extract_detail_value(soup, ['To Apply', 'To apply'])

            min_gpa = self._extract_detail_value(soup, ['Min. GPA', 'Minimum GPA'])
            _award_type = self._extract_detail_value(soup, ['Award type'])  # intentionally ignored

            detail_data['min_gpa'] = self._parse_gpa_value(min_gpa)

            eligibility_notes: List[str] = []

            detail_data['eligibility_notes'] = eligibility_notes
            detail_data['organization'] = self._extract_sponsor_organization(soup)

            return detail_data

        except Exception as e:
            logger.warning(f"Failed to fetch detail data for {detail_url}: {e}")
            return {}

    def _extract_detail_value(self, soup: BeautifulSoup, labels: List[str]) -> Optional[str]:
        for label in labels:
            label_regex = re.compile(rf'^\s*{re.escape(label)}', re.IGNORECASE)
            matches = soup.find_all(string=label_regex)
            for match in matches:
                value = self._extract_value_from_match(match)
                if value:
                    return value
        return None

    def _extract_value_from_match(self, match: Any) -> Optional[str]:
        if isinstance(match, NavigableString):
            text = str(match).strip()
            if ':' in text:
                parts = text.split(':', 1)
                value = parts[1].strip()
                if value:
                    return value

            parent = match.parent
        else:
            parent = match

        if not isinstance(parent, Tag):
            return None

        parent_text = parent.get_text(' ', strip=True)
        if ':' in parent_text:
            parts = parent_text.split(':', 1)
            value = parts[1].strip()
            if value:
                return value

        sibling = parent.next_sibling
        while sibling and isinstance(sibling, NavigableString) and not sibling.strip():
            sibling = sibling.next_sibling

        if isinstance(sibling, NavigableString):
            value = sibling.strip()
            return value or None

        if isinstance(sibling, Tag):
            value = sibling.get_text(' ', strip=True)
            return value or None

        return None

    def _extract_apply_link(self, soup: BeautifulSoup, detail_url: str) -> Optional[str]:
        apply_link = soup.find('a', string=re.compile(r'apply online', re.IGNORECASE))
        if not apply_link:
            apply_link = soup.find('a', attrs={'title': re.compile(r'apply', re.IGNORECASE)})

        if apply_link and apply_link.get('href'):
            return urljoin(detail_url, apply_link.get('href'))

        return None

    def _extract_sponsor_organization(self, soup: BeautifulSoup) -> Optional[str]:
        heading = soup.find(lambda tag: tag.name in ['h2', 'h3', 'h4'] and tag.get_text(strip=True).lower() == 'sponsor information')
        if not heading:
            return None

        paragraph = heading.find_next('p')
        while paragraph:
            text = paragraph.get_text('\n', strip=True)
            if text:
                for line in text.split('\n'):
                    cleaned = line.strip()
                    lower_line = cleaned.lower()
                    if not cleaned:
                        continue
                    if lower_line.startswith(('phone', 'fax', 'http', 'www')):
                        continue
                    if '@' in lower_line:
                        continue
                    return cleaned
            next_paragraph = paragraph.find_next('p')
            if next_paragraph == paragraph:
                break
            paragraph = next_paragraph

        return None

    def _parse_currency_value(self, value: Optional[str]) -> Optional[float]:
        if not value:
            return None

        cleaned = re.sub(r'[^0-9.]', '', value)
        if not cleaned:
            return None

        try:
            return float(cleaned)
        except ValueError:
            return None

    def _parse_gpa_value(self, value: Optional[str]) -> Optional[float]:
        if not value:
            return None

        cleaned = re.sub(r'[^0-9.]', '', value)
        if not cleaned:
            return None

        try:
            return float(cleaned)
        except ValueError:
            return None

    def _parse_boolean_value(self, value: Optional[str]) -> Optional[bool]:
        if not value:
            return None

        lowered = value.strip().lower()
        if lowered in ('yes', 'y', 'true'): 
            return True
        if lowered in ('no', 'n', 'false'):
            return False
        return None

    def _sanitize_filename(self, url: str) -> str:
        parsed = urlparse(url)
        path = parsed.path.strip('/') or 'scholarship'
        path = path.replace('/', '_')
        if parsed.query:
            path = f"{path}_{parsed.query.replace('=', '-').replace('&', '_')}"
        sanitized = re.sub(r'[^A-Za-z0-9_.-]', '_', path)
        return sanitized[:200]
    
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

    def _normalize_eligibility_text(self, text: str) -> str:
        if not text:
            return text

        normalized = re.sub(r"\b([A-Za-z’'`-]+?)-level study\b", r"\1", text, flags=re.IGNORECASE)
        normalized = re.sub(r"\s{2,}", " ", normalized).strip()
        return normalized
    
    def _map_enrollment_level(self, enrollment_level: str) -> Optional[str]:
        """Map Enrollment level to standardized academic_level values.
        
        Parameters:
            enrollment_level: Raw enrollment level string from detail page (e.g., "High school senior").
            
        Returns:
            Mapped academic level or None if should be ignored.
        """
        if not enrollment_level:
            return None
        
        level_lower = enrollment_level.strip().lower()
        
        # Map high school levels
        if 'high school' in level_lower:
            return 'high school'
        
        # Map college/undergraduate levels
        if any(term in level_lower for term in ['college', 'undergraduate', 'bachelor', 'associate']):
            return 'undergraduate'
        
        # Map graduate levels
        if any(term in level_lower for term in ['graduate', 'masters', 'master', 'doctoral', 'phd', 'doctorate']):
            return 'graduate'
        
        # Default: return None for unrecognized levels
        return None
    
    def _parse_major_to_subject_areas(self, major: str) -> Optional[List[str]]:
        """Parse Major field into subject_areas array.
        
        Parameters:
            major: Major field value from detail page (e.g., "Jewish/Judaic Studies, Religion/Religious Studies").
            
        Returns:
            List of subject area strings, or None if empty.
        """
        if not major:
            return None
        
        # Clean and split major text
        major_cleaned = self._clean_text(major)
        
        # Split by common delimiters (comma, slash, semicolon)
        areas = re.split(r'[,;/]', major_cleaned)
        
        # Clean each area and filter empty ones
        subject_areas = []
        for area in areas:
            cleaned = area.strip().lower()
            if cleaned:
                subject_areas.append(cleaned)
        
        return subject_areas if subject_areas else None
    
    def _extract_gpa_from_text(self, text: str) -> Optional[float]:
        """Extract GPA value from text (e.g., "minimum x.y GPA").
        
        Parameters:
            text: Text to search for GPA patterns.
            
        Returns:
            GPA value as float, or None if not found.
        """
        if not text:
            return None
        
        text_lower = text.lower()
        
        # Try pattern: "minimum x.y GPA" or "minimum x.y gpa"
        gpa_patterns = [
            r'minimum\s+([\d.]+)\s+gpa',
            r'min\s+([\d.]+)\s+gpa',
            r'gpa\s+of\s+([\d.]+)',
            r'gpa\s*[:\-]?\s*([\d.]+)',
            r'([\d.]+)\s+gpa\s+required',
            r'([\d.]+)\s+gpa\s+minimum',
        ]
        
        for pattern in gpa_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    gpa_value = float(match.group(1))
                    # Validate GPA is in reasonable range (0.0 to 4.0 or 0.0 to 5.0)
                    if 0.0 <= gpa_value <= 5.0:
                        return gpa_value
                except (ValueError, IndexError):
                    continue
        
        return None
    
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
        
        for scholarship in scholarships:
            key = f"{scholarship.title.lower()}-{scholarship.organization.lower()}"
            if key not in seen:
                seen.add(key)
                unique.append(scholarship)
        
        return unique
    
    def _store_raw_data(self, filename: str, content: str, content_type: str):
        """Store raw data (placeholder for S3 storage)"""
        # In a real implementation, this would store to S3
        # For now, just log that we would store it
        logger.debug(f"Would store raw data: {filename} ({len(content)} bytes)")
