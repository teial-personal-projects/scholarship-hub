#!/usr/bin/env python3
"""
Content Extraction Pipeline
AI-enhanced extraction of scholarship details from various content types
"""

import os
import json
import logging
import requests
import time
import re
from typing import List, Dict, Any, Optional, Tuple, Union
from urllib.parse import urljoin, urlparse
from datetime import datetime
from dataclasses import dataclass, asdict
from bs4 import BeautifulSoup
import hashlib

logger = logging.getLogger(__name__)


@dataclass
class ExtractedScholarship:
    """Represents extracted scholarship information"""
    title: str
    organization: str
    description: str
    url: str
    source_type: str
    award_amount: Optional[str] = None
    min_award: Optional[float] = None
    max_award: Optional[float] = None
    deadline: Optional[str] = None
    eligibility: Optional[str] = None
    requirements: List[str] = None
    academic_level: Optional[str] = None
    geographic_restrictions: Optional[str] = None
    contact_info: Optional[str] = None
    application_url: Optional[str] = None
    extracted_at: Optional[datetime] = None
    confidence: float = 0.0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.requirements is None:
            self.requirements = []
        if self.metadata is None:
            self.metadata = {}
        if self.extracted_at is None:
            self.extracted_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExtractionResult:
    """Result of content extraction"""
    success: bool
    scholarships: List[ExtractedScholarship]
    raw_content: Optional[str] = None
    errors: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.metadata is None:
            self.metadata = {}


class ContentExtractionPipeline:
    """AI-enhanced content extraction pipeline"""
    
    def __init__(self, openai_api_key: str = None):
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        
        # Initialize OpenAI client if available
        self.openai_client = None
        if self.openai_api_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.warning("OpenAI package not installed. Install with: pip install openai")
        
        # Session for requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Extraction patterns
        self.extraction_patterns = self._initialize_extraction_patterns()
    
    def _initialize_extraction_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize extraction patterns for different content types"""
        return {
            'amount_patterns': [
                r'\$[\d,]+(?:-\$[\d,]+)?',  # $1,000 or $1,000-$5,000
                r'\$[\d,]+(?:\s+to\s+\$[\d,]+)?',  # $1,000 to $5,000
                r'\$[\d,]+(?:\s+-\s+\$[\d,]+)?',  # $1,000 - $5,000
                r'[\d,]+(?:\s+to\s+[\d,]+)?\s*dollars?',  # 1,000 to 5,000 dollars
                r'[\d,]+(?:\s+-\s+[\d,]+)?\s*dollars?',  # 1,000 - 5,000 dollars
            ],
            'deadline_patterns': [
                r'(?:deadline|due date|apply by|application deadline)[:\s]*([a-zA-Z]+\s+\d{1,2},?\s+\d{4})',
                r'(?:deadline|due date|apply by|application deadline)[:\s]*(\d{1,2}/\d{1,2}/\d{4})',
                r'(?:deadline|due date|apply by|application deadline)[:\s]*(\d{1,2}-\d{1,2}-\d{4})',
                r'([a-zA-Z]+\s+\d{1,2},?\s+\d{4})\s*(?:deadline|due date)',
                r'(\d{1,2}/\d{1,2}/\d{4})\s*(?:deadline|due date)',
            ],
            'eligibility_patterns': [
                r'(?:eligibility|requirements|qualifications)[:\s]*(.+)',
                r'(?:must be|should be|applicants must)[:\s]*(.+)',
                r'(?:open to|available to)[:\s]*(.+)',
            ],
            'academic_level_patterns': [
                r'(?:undergraduate|graduate|high school|college|university|phd|masters?)',
                r'(?:freshman|sophomore|junior|senior)',
                r'(?:bachelor|master|doctorate|associate)',
            ],
            'contact_patterns': [
                r'(?:contact|email|phone)[:\s]*([^\n]+)',
                r'(?:for more information|questions)[:\s]*([^\n]+)',
                r'(?:apply|application)[:\s]*([^\n]+)',
            ]
        }
    
    def extract_from_url(self, url: str, source_type: str = "unknown") -> ExtractionResult:
        """Extract scholarship information from a URL"""
        try:
            logger.info(f"Extracting content from: {url}")
            
            # Fetch content
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '').lower()
            
            if 'text/html' in content_type:
                return self._extract_from_html(response.text, url, source_type)
            elif 'application/pdf' in content_type:
                return self._extract_from_pdf(response.content, url, source_type)
            else:
                return ExtractionResult(
                    success=False,
                    scholarships=[],
                    errors=[f"Unsupported content type: {content_type}"]
                )
                
        except Exception as e:
            error_msg = f"Error extracting from {url}: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(
                success=False,
                scholarships=[],
                errors=[error_msg]
            )
    
    def _extract_from_html(self, html_content: str, url: str, source_type: str) -> ExtractionResult:
        """Extract scholarship information from HTML content"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Clean content
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text content
            text_content = soup.get_text()
            text_content = ' '.join(text_content.split())
            
            # Check if page contains scholarship-related content
            if not self._is_scholarship_page(text_content):
                return ExtractionResult(
                    success=True,
                    scholarships=[],
                    raw_content=text_content[:1000],
                    metadata={'reason': 'No scholarship content detected'}
                )
            
            # Extract using AI if available
            if self.openai_client:
                scholarships = self._ai_extract_scholarships(text_content, url, source_type, soup)
            else:
                scholarships = self._fallback_extract_scholarships(text_content, url, source_type, soup)
            
            return ExtractionResult(
                success=True,
                scholarships=scholarships,
                raw_content=text_content[:1000],
                metadata={'extraction_method': 'ai' if self.openai_client else 'fallback'}
            )
            
        except Exception as e:
            error_msg = f"Error extracting from HTML: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(
                success=False,
                scholarships=[],
                errors=[error_msg]
            )
    
    def _extract_from_pdf(self, pdf_content: bytes, url: str, source_type: str) -> ExtractionResult:
        """Extract scholarship information from PDF content"""
        try:
            # TODO: Implement PDF text extraction
            # For now, return a placeholder result
            logger.info(f"PDF extraction not yet implemented for {url}")
            
            return ExtractionResult(
                success=True,
                scholarships=[],
                metadata={'reason': 'PDF extraction not implemented'}
            )
            
        except Exception as e:
            error_msg = f"Error extracting from PDF: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(
                success=False,
                scholarships=[],
                errors=[error_msg]
            )
    
    def _is_scholarship_page(self, content: str) -> bool:
        """Check if page contains scholarship-related content"""
        scholarship_keywords = [
            'scholarship', 'award', 'grant', 'financial aid', 'student funding',
            'educational opportunity', 'tuition assistance', 'academic award'
        ]
        
        content_lower = content.lower()
        return any(keyword in content_lower for keyword in scholarship_keywords)
    
    def _ai_extract_scholarships(self, content: str, url: str, source_type: str, soup: BeautifulSoup) -> List[ExtractedScholarship]:
        """Extract scholarship information using AI"""
        try:
            # Get page title and meta description
            title = soup.find('title')
            title_text = title.get_text() if title else ""
            
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            meta_text = meta_desc.get('content', '') if meta_desc else ""
            
            # Prepare content for AI
            ai_content = content[:3000]  # Limit for API
            
            prompt = f"""Extract scholarship information from this webpage content.

URL: {url}
Source Type: {source_type}
Page Title: {title_text}
Meta Description: {meta_text}

Content: {ai_content}

Extract ALL scholarship opportunities mentioned on this page. Return as JSON array:

[
  {{
    "title": "scholarship title",
    "organization": "organization name",
    "description": "brief description",
    "award_amount": "award amount (e.g., $1000, $500-$2000, varies)",
    "deadline": "application deadline",
    "eligibility": "eligibility requirements",
    "requirements": ["list", "of", "requirements"],
    "academic_level": "undergraduate/graduate/high school",
    "geographic_restrictions": "geographic limitations if any",
    "contact_info": "contact information",
    "application_url": "application URL if mentioned",
    "confidence": 0.0-1.0
  }}
]

If no scholarships found, return empty array []. Be accurate and don't make up information."""

            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000
            )
            
            ai_data = json.loads(response.choices[0].message.content)
            
            scholarships = []
            for item in ai_data:
                try:
                    scholarship = self._create_scholarship_from_ai_data(item, url, source_type)
                    if scholarship:
                        scholarships.append(scholarship)
                except Exception as e:
                    logger.error(f"Error creating scholarship from AI data: {e}")
                    continue
            
            return scholarships
            
        except Exception as e:
            logger.error(f"Error in AI extraction: {str(e)}")
            return self._fallback_extract_scholarships(content, url, source_type, soup)
    
    def _fallback_extract_scholarships(self, content: str, url: str, source_type: str, soup: BeautifulSoup) -> List[ExtractedScholarship]:
        """Fallback extraction using pattern matching"""
        scholarships = []
        
        try:
            # Extract basic information
            title = soup.find('title')
            title_text = title.get_text() if title else ""
            
            # Extract organization from URL
            domain = urlparse(url).netloc
            organization = domain.replace('www.', '').replace('.com', '').replace('.org', '').title()
            
            # Extract amount
            amount = self._extract_amount(content)
            min_award, max_award = self._parse_amount(amount)
            
            # Extract deadline
            deadline = self._extract_deadline(content)
            
            # Extract eligibility
            eligibility = self._extract_eligibility(content)
            
            # Extract academic level
            academic_level = self._extract_academic_level(content)
            
            # Extract contact info
            contact_info = self._extract_contact_info(content)
            
            # Create scholarship object
            scholarship = ExtractedScholarship(
                title=title_text or f"Scholarship from {organization}",
                organization=organization,
                description=f"Scholarship opportunity from {organization}",
                url=url,
                source_type=source_type,
                award_amount=amount,
                min_award=min_award,
                max_award=max_award,
                deadline=deadline,
                eligibility=eligibility,
                academic_level=academic_level,
                contact_info=contact_info,
                confidence=0.6  # Lower confidence for fallback extraction
            )
            
            scholarships.append(scholarship)
            
        except Exception as e:
            logger.error(f"Error in fallback extraction: {str(e)}")
        
        return scholarships
    
    def _create_scholarship_from_ai_data(self, ai_data: Dict[str, Any], url: str, source_type: str) -> Optional[ExtractedScholarship]:
        """Create ExtractedScholarship from AI data"""
        try:
            # Parse amount
            amount = ai_data.get('award_amount', '')
            min_award, max_award = self._parse_amount(amount)
            
            scholarship = ExtractedScholarship(
                title=ai_data.get('title', '')[:200],
                organization=ai_data.get('organization', '')[:100],
                description=ai_data.get('description', '')[:500],
                url=url,
                source_type=source_type,
                award_amount=amount,
                min_award=min_award,
                max_award=max_award,
                deadline=ai_data.get('deadline', ''),
                eligibility=ai_data.get('eligibility', '')[:500],
                requirements=ai_data.get('requirements', []),
                academic_level=ai_data.get('academic_level', '')[:50],
                geographic_restrictions=ai_data.get('geographic_restrictions', ''),
                contact_info=ai_data.get('contact_info', ''),
                application_url=ai_data.get('application_url', ''),
                confidence=ai_data.get('confidence', 0.7)
            )
            
            return scholarship
            
        except Exception as e:
            logger.error(f"Error creating scholarship from AI data: {str(e)}")
            return None
    
    def _extract_amount(self, content: str) -> Optional[str]:
        """Extract award amount from content"""
        for pattern in self.extraction_patterns['amount_patterns']:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                return matches[0]
        return None
    
    def _parse_amount(self, amount_text: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
        """Parse amount text into min and max values"""
        if not amount_text:
            return None, None
        
        try:
            # Remove $ and commas
            clean_text = amount_text.replace('$', '').replace(',', '')
            
            # Look for ranges
            if '-' in clean_text:
                parts = clean_text.split('-')
                if len(parts) == 2:
                    min_val = float(parts[0].strip())
                    max_val = float(parts[1].strip())
                    return min_val, max_val
            
            # Look for "to" ranges
            if 'to' in clean_text:
                parts = clean_text.split('to')
                if len(parts) == 2:
                    min_val = float(parts[0].strip())
                    max_val = float(parts[1].strip())
                    return min_val, max_val
            
            # Single amount
            numbers = re.findall(r'[\d,]+', clean_text)
            if numbers:
                amount = float(numbers[0].replace(',', ''))
                return amount, amount
            
        except (ValueError, IndexError):
            pass
        
        return None, None
    
    def _extract_deadline(self, content: str) -> Optional[str]:
        """Extract deadline from content"""
        for pattern in self.extraction_patterns['deadline_patterns']:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                return matches[0]
        return None
    
    def _extract_eligibility(self, content: str) -> Optional[str]:
        """Extract eligibility requirements from content"""
        for pattern in self.extraction_patterns['eligibility_patterns']:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                return matches[0][:200]  # Limit length
        return None
    
    def _extract_academic_level(self, content: str) -> Optional[str]:
        """Extract academic level from content"""
        content_lower = content.lower()
        
        for pattern in self.extraction_patterns['academic_level_patterns']:
            matches = re.findall(pattern, content_lower)
            if matches:
                return matches[0].title()
        return None
    
    def _extract_contact_info(self, content: str) -> Optional[str]:
        """Extract contact information from content"""
        for pattern in self.extraction_patterns['contact_patterns']:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                return matches[0][:100]  # Limit length
        return None
    
    def batch_extract(self, urls: List[str], source_types: List[str] = None) -> List[ExtractionResult]:
        """Extract scholarship information from multiple URLs"""
        if source_types is None:
            source_types = ['unknown'] * len(urls)
        
        results = []
        
        for i, (url, source_type) in enumerate(zip(urls, source_types)):
            try:
                logger.info(f"Processing {i+1}/{len(urls)}: {url}")
                result = self.extract_from_url(url, source_type)
                results.append(result)
                
                # Rate limiting
                time.sleep(1)
                
            except Exception as e:
                error_msg = f"Error processing {url}: {str(e)}"
                logger.error(error_msg)
                results.append(ExtractionResult(
                    success=False,
                    scholarships=[],
                    errors=[error_msg]
                ))
        
        return results


# Example usage
if __name__ == "__main__":
    # Demo function for testing
    def demo_content_extraction():
        """Demo the content extraction functionality"""
        print("Content Extraction Pipeline Demo")
        print("=================================")
        
        # Check for API keys
        openai_key = os.getenv('OPENAI_API_KEY')
        
        if not openai_key:
            print("Warning: OPENAI_API_KEY not found. Will use fallback extraction.")
        
        # Initialize extraction pipeline
        pipeline = ContentExtractionPipeline()
        
        # Test URLs (replace with actual scholarship URLs)
        test_urls = [
            "https://example.com/scholarship1",
            "https://example.com/scholarship2"
        ]
        
        print("\n1. Testing content extraction...")
        
        for url in test_urls:
            print(f"\nExtracting from: {url}")
            result = pipeline.extract_from_url(url, "test_source")
            
            if result.success:
                print(f"  Success: {len(result.scholarships)} scholarships found")
                for i, scholarship in enumerate(result.scholarships, 1):
                    print(f"  {i}. {scholarship.title}")
                    print(f"     Organization: {scholarship.organization}")
                    print(f"     Amount: {scholarship.award_amount}")
                    print(f"     Confidence: {scholarship.confidence:.2f}")
            else:
                print(f"  Failed: {result.errors}")
        
        # Test batch extraction
        print("\n2. Testing batch extraction...")
        batch_results = pipeline.batch_extract(test_urls, ["test_source"] * len(test_urls))
        
        total_scholarships = sum(len(r.scholarships) for r in batch_results if r.success)
        print(f"  Total scholarships found: {total_scholarships}")
    
    # Run demo if script is executed directly
    demo_content_extraction()
