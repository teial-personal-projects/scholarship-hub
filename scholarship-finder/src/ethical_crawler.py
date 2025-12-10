#!/usr/bin/env python3
"""
Ethical Web Crawler
Follows web crawling best practices with robots.txt compliance
"""

import os
import time
import logging
import requests
import random
from typing import List, Dict, Any, Optional, Set, Deque
from urllib.parse import urljoin, urlparse, parse_qs
from collections import deque
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class CrawlConfig:
    """Configuration for ethical crawling"""
    user_agent: str = "ScholarshipTrackerBot/1.0 (+https://github.com/your-repo/scholarship-tracker)"
    crawl_delay: float = 1.0  # Default delay between requests
    max_pages_per_domain: int = 50
    max_depth: int = 3
    timeout: int = 30
    max_retries: int = 3
    respect_robots_txt: bool = True
    respect_sitemaps: bool = True
    follow_links: bool = True
    extract_pdfs: bool = True
    extract_news: bool = True


@dataclass
class RobotsTxtRules:
    """Parsed robots.txt rules"""
    allowed: Set[str] = None
    disallowed: Set[str] = None
    crawl_delay: Optional[float] = None
    sitemap_urls: List[str] = None
    
    def __post_init__(self):
        if self.allowed is None:
            self.allowed = set()
        if self.disallowed is None:
            self.disallowed = set()
        if self.sitemap_urls is None:
            self.sitemap_urls = []


class RobotsTxtParser:
    """Parse and handle robots.txt files"""
    
    def __init__(self, user_agent: str = "*"):
        self.user_agent = user_agent
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'ScholarshipTrackerBot/1.0'
        })
    
    def fetch_and_parse(self, domain: str) -> RobotsTxtRules:
        """Fetch and parse robots.txt for a domain"""
        rules = RobotsTxtRules()
        
        # Ensure domain has protocol
        if not domain.startswith(('http://', 'https://')):
            domain = 'https://' + domain
        
        robots_url = urljoin(domain, '/robots.txt')
        
        try:
            logger.info(f"Fetching robots.txt from {robots_url}")
            response = self.session.get(robots_url, timeout=10)
            
            if response.status_code == 200:
                return self._parse_robots_content(response.text, domain)
            else:
                logger.info(f"No robots.txt found at {robots_url} (Status: {response.status_code})")
                return rules
                
        except Exception as e:
            logger.warning(f"Error fetching robots.txt from {robots_url}: {e}")
            return rules
    
    def _parse_robots_content(self, content: str, domain: str) -> RobotsTxtRules:
        """Parse robots.txt content"""
        rules = RobotsTxtRules()
        current_user_agent = None
        
        for line in content.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            if ':' in line:
                directive, value = line.split(':', 1)
                directive = directive.strip().lower()
                value = value.strip()
                
                if directive == 'user-agent':
                    current_user_agent = value
                elif directive == 'disallow' and (current_user_agent == '*' or current_user_agent == self.user_agent):
                    if value:
                        rules.disallowed.add(value)
                elif directive == 'allow' and (current_user_agent == '*' or current_user_agent == self.user_agent):
                    if value:
                        rules.allowed.add(value)
                elif directive == 'crawl-delay' and (current_user_agent == '*' or current_user_agent == self.user_agent):
                    try:
                        rules.crawl_delay = float(value)
                    except ValueError:
                        pass
                elif directive == 'sitemap':
                    rules.sitemap_urls.append(value)
        
        logger.info(f"Parsed robots.txt: {len(rules.disallowed)} disallowed, {len(rules.allowed)} allowed, "
                   f"crawl-delay: {rules.crawl_delay}, sitemaps: {len(rules.sitemap_urls)}")
        return rules
    
    def can_fetch(self, url: str, rules: RobotsTxtRules) -> bool:
        """Check if URL can be fetched according to robots.txt rules"""
        parsed_url = urlparse(url)
        path = parsed_url.path
        
        # Check disallowed patterns
        for disallowed in rules.disallowed:
            if path.startswith(disallowed):
                return False
        
        # Check allowed patterns (if any specific allows exist)
        if rules.allowed:
            for allowed in rules.allowed:
                if path.startswith(allowed):
                    return True
            return False
        
        return True


class SitemapProcessor:
    """Process sitemaps for efficient URL discovery"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'ScholarshipTrackerBot/1.0'
        })
    
    def extract_urls_from_sitemaps(self, sitemap_urls: List[str], domain: str) -> List[str]:
        """Extract URLs from sitemap files"""
        all_urls = []
        
        for sitemap_url in sitemap_urls:
            try:
                logger.info(f"Processing sitemap: {sitemap_url}")
                response = self.session.get(sitemap_url, timeout=15)
                response.raise_for_status()
                
                urls = self._parse_sitemap(response.text, domain)
                all_urls.extend(urls)
                
                time.sleep(1)  # Be respectful
                
            except Exception as e:
                logger.error(f"Error processing sitemap {sitemap_url}: {e}")
        
        # Remove duplicates and filter for relevant URLs
        unique_urls = list(set(all_urls))
        relevant_urls = self._filter_relevant_urls(unique_urls)
        
        logger.info(f"Extracted {len(relevant_urls)} relevant URLs from sitemaps")
        return relevant_urls
    
    def _parse_sitemap(self, content: str, domain: str) -> List[str]:
        """Parse sitemap XML content"""
        urls = []
        
        try:
            root = ET.fromstring(content)
            
            # Handle both sitemap and sitemapindex
            for loc in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                url = loc.text.strip()
                
                # If it's a sitemap index, recursively process
                if 'sitemap' in url.lower():
                    sub_urls = self.extract_urls_from_sitemaps([url], domain)
                    urls.extend(sub_urls)
                else:
                    urls.append(url)
                    
        except ET.ParseError as e:
            logger.error(f"Error parsing sitemap XML: {e}")
        
        return urls
    
    def _filter_relevant_urls(self, urls: List[str]) -> List[str]:
        """Filter URLs for scholarship-relevant content"""
        relevant_keywords = [
            'scholarship', 'award', 'grant', 'financial-aid', 'student',
            'education', 'academic', 'tuition', 'funding', 'opportunity'
        ]
        
        filtered_urls = []
        for url in urls:
            url_lower = url.lower()
            
            # Check for scholarship-related keywords
            if any(keyword in url_lower for keyword in relevant_keywords):
                filtered_urls.append(url)
            # Also include pages that might contain scholarship info
            elif any(term in url_lower for term in ['about', 'programs', 'services', 'community']):
                filtered_urls.append(url)
        
        return filtered_urls


class EthicalCrawler:
    """Main ethical web crawler class"""
    
    def __init__(self, config: CrawlConfig = None):
        self.config = config or CrawlConfig()
        self.robots_parser = RobotsTxtParser(self.config.user_agent)
        self.sitemap_processor = SitemapProcessor()
        
        # Crawling state
        self.crawled_urls: Set[str] = set()
        self.urls_to_crawl: Deque[str] = deque()
        self.domain_rules: Dict[str, RobotsTxtRules] = {}
        self.domain_last_crawl: Dict[str, datetime] = {}
        
        # Session for requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.config.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def crawl_url(self, url: str) -> Dict[str, Any]:
        """Crawl a single URL and return content"""
        logger.info(f"Crawling single URL: {url}")
        
        try:
            # Parse URL to get domain
            parsed_url = urlparse(url)
            domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Check robots.txt if not already done
            if self.config.respect_robots_txt and domain not in self.domain_rules:
                self.domain_rules[domain] = self.robots_parser.fetch_and_parse(domain)
            
            # Check if allowed by robots.txt
            if self.config.respect_robots_txt and domain in self.domain_rules:
                if not self.robots_parser.can_fetch(url, self.domain_rules[domain]):
                    logger.warning(f"Robots.txt disallows crawling {url}")
                    return {'success': False, 'reason': 'robots_txt_disallows'}
            
            # Respect crawl delay
            self._respect_crawl_delay(domain)
            
            # Crawl the single page
            result = self._crawl_page(url)
            
            if result['success']:
                return {
                    'success': True,
                    'content': result.get('content', ''),
                    'title': result.get('title', ''),
                    'links': result.get('links', []),
                    'scholarship_data': result.get('scholarship_data', [])
                }
            else:
                return result
                
        except Exception as e:
            logger.error(f"Error crawling URL {url}: {e}")
            return {'success': False, 'reason': str(e)}
    
    def crawl_domain(self, start_url: str, max_pages: int = None) -> Dict[str, Any]:
        """Crawl a domain for scholarship opportunities"""
        if max_pages is None:
            max_pages = self.config.max_pages_per_domain
        
        logger.info(f"Starting ethical crawl of {start_url} (max {max_pages} pages)")
        
        # Initialize crawl
        self.crawled_urls.clear()
        self.urls_to_crawl.clear()
        
        parsed_url = urlparse(start_url)
        domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Get robots.txt rules
        if self.config.respect_robots_txt:
            self.domain_rules[domain] = self.robots_parser.fetch_and_parse(domain)
            rules = self.domain_rules[domain]
            
            if not self.robots_parser.can_fetch(start_url, rules):
                logger.warning(f"Robots.txt disallows crawling {start_url}")
                return {'success': False, 'reason': 'robots_txt_disallows'}
        
        # Get sitemap URLs if available
        if self.config.respect_sitemaps and domain in self.domain_rules:
            sitemap_urls = self.domain_rules[domain].sitemap_urls
            if sitemap_urls:
                sitemap_urls = self.sitemap_processor.extract_urls_from_sitemaps(sitemap_urls, domain)
                self.urls_to_crawl.extend(sitemap_urls)
        
        # Add start URL if no sitemap URLs found
        if not self.urls_to_crawl:
            self.urls_to_crawl.append(start_url)
        
        # Start crawling
        pages_crawled = 0
        scholarship_data = []
        errors = []
        
        while self.urls_to_crawl and pages_crawled < max_pages:
            url = self.urls_to_crawl.popleft()
            
            if url in self.crawled_urls:
                continue
            
            # Check robots.txt
            if self.config.respect_robots_txt and domain in self.domain_rules:
                if not self.robots_parser.can_fetch(url, self.domain_rules[domain]):
                    logger.info(f"Skipping {url} (robots.txt disallows)")
                    self.crawled_urls.add(url)
                    continue
            
            # Respect crawl delay
            self._respect_crawl_delay(domain)
            
            # Crawl the page
            try:
                result = self._crawl_page(url)
                if result['success']:
                    pages_crawled += 1
                    if result.get('scholarship_data'):
                        scholarship_data.extend(result['scholarship_data'])
                    
                    # Extract new URLs if following links
                    if self.config.follow_links and result.get('links'):
                        new_urls = self._filter_new_urls(result['links'], domain)
                        self.urls_to_crawl.extend(new_urls)
                
                self.crawled_urls.add(url)
                
            except Exception as e:
                error_msg = f"Error crawling {url}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                self.crawled_urls.add(url)
        
        logger.info(f"Crawl complete: {pages_crawled} pages crawled, {len(scholarship_data)} scholarship opportunities found")
        
        return {
            'success': True,
            'pages_crawled': pages_crawled,
            'scholarship_data': scholarship_data,
            'errors': errors,
            'domain': domain
        }
    
    def _crawl_page(self, url: str) -> Dict[str, Any]:
        """Crawl a single page"""
        try:
            logger.info(f"Crawling: {url}")
            
            response = self.session.get(url, timeout=self.config.timeout)
            response.raise_for_status()
            
            content_type = response.headers.get('Content-Type', '').lower()
            
            if 'text/html' in content_type:
                return self._process_html_page(url, response.text)
            elif 'application/pdf' in content_type and self.config.extract_pdfs:
                return self._process_pdf_page(url, response.content)
            else:
                return {'success': True, 'content_type': content_type}
                
        except requests.RequestException as e:
            logger.error(f"Request error for {url}: {e}")
            return {'success': False, 'error': str(e)}
    
    def _process_html_page(self, url: str, html_content: str) -> Dict[str, Any]:
        """Process HTML page content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract scholarship data
        scholarship_data = self._extract_scholarship_data(soup, url)
        
        # Extract links for further crawling
        links = []
        if self.config.follow_links:
            for a in soup.find_all('a', href=True):
                href = a['href']
                full_url = urljoin(url, href)
                links.append(full_url)
        
        # Extract PDF links
        pdf_links = []
        if self.config.extract_pdfs:
            for a in soup.find_all('a', href=True):
                href = a['href']
                if href.lower().endswith('.pdf'):
                    full_url = urljoin(url, href)
                    pdf_links.append(full_url)
        
        return {
            'success': True,
            'scholarship_data': scholarship_data,
            'links': links,
            'pdf_links': pdf_links
        }
    
    def _process_pdf_page(self, url: str, pdf_content: bytes) -> Dict[str, Any]:
        """Process PDF content (placeholder for PDF extraction)"""
        # TODO: Implement PDF text extraction
        logger.info(f"PDF found: {url} (extraction not yet implemented)")
        return {
            'success': True,
            'content_type': 'application/pdf',
            'pdf_url': url
        }
    
    def _extract_scholarship_data(self, soup: BeautifulSoup, url: str) -> List[Dict[str, Any]]:
        """Extract scholarship information from page content"""
        scholarship_data = []
        
        # Look for scholarship-related content
        scholarship_keywords = [
            'scholarship', 'award', 'grant', 'financial aid', 'student funding',
            'educational opportunity', 'tuition assistance', 'academic award'
        ]
        
        # Check page title and meta description
        title = soup.find('title')
        title_text = title.get_text() if title else ""
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        meta_text = meta_desc.get('content', '') if meta_desc else ""
        
        # Check if page is scholarship-related
        page_text = soup.get_text().lower()
        is_scholarship_page = any(keyword in page_text for keyword in scholarship_keywords)
        
        if is_scholarship_page:
            # Extract basic information
            data = {
                'url': url,
                'title': title_text,
                'description': meta_text,
                'extracted_at': datetime.now().isoformat(),
                'content_preview': page_text[:500] + '...' if len(page_text) > 500 else page_text
            }
            
            # Try to extract more specific details
            data.update(self._extract_scholarship_details(soup))
            scholarship_data.append(data)
        
        return scholarship_data
    
    def _extract_scholarship_details(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract specific scholarship details from page"""
        details = {}
        
        # Look for common patterns
        patterns = {
            'amount': r'\$[\d,]+',
            'deadline': r'(deadline|due date|apply by)[:\s]*([a-zA-Z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})',
            'eligibility': r'(eligibility|requirements|qualifications)[:\s]*(.+)',
            'contact': r'(contact|email|phone)[:\s]*([^\n]+)'
        }
        
        page_text = soup.get_text()
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            if matches:
                details[key] = matches[0] if isinstance(matches[0], str) else matches[0][1]
        
        return details
    
    def _filter_new_urls(self, urls: List[str], domain: str) -> List[str]:
        """Filter URLs to only include new ones from the same domain"""
        filtered = []
        parsed_domain = urlparse(domain)
        
        for url in urls:
            parsed_url = urlparse(url)
            
            # Only include URLs from the same domain
            if parsed_url.netloc == parsed_domain.netloc:
                # Only include URLs we haven't crawled
                if url not in self.crawled_urls:
                    filtered.append(url)
        
        return filtered[:20]  # Limit to avoid overwhelming
    
    def _respect_crawl_delay(self, domain: str):
        """Respect crawl delay for domain"""
        if domain in self.domain_rules:
            delay = self.domain_rules[domain].crawl_delay or self.config.crawl_delay
        else:
            delay = self.config.crawl_delay
        
        # Add some randomization to avoid being too predictable
        actual_delay = delay + random.uniform(0, 0.5)
        time.sleep(actual_delay)
        
        # Update last crawl time
        self.domain_last_crawl[domain] = datetime.now()


# Example usage
if __name__ == "__main__":
    # Test the ethical crawler
    config = CrawlConfig(
        user_agent="ScholarshipTrackerBot/1.0",
        crawl_delay=2.0,
        max_pages_per_domain=10,
        max_depth=2
    )
    
    crawler = EthicalCrawler(config)
    
    # Test with a sample domain
    test_url = "https://example.com/scholarships"
    result = crawler.crawl_domain(test_url, max_pages=5)
    
    print(f"Crawl result: {result}")
