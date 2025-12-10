"""
AI-Powered Scholarship Discovery
Finds scholarships from businesses, organizations, and non-traditional sources
"""
import os
from typing import List, Dict, Optional
from openai import OpenAI
import requests
from bs4 import BeautifulSoup
import json

class AIDiscoveryEngine:
    def __init__(self, db_connection):
        self.db = db_connection
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_cx = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')

    def generate_search_queries(self, category: str, keywords: List[str]) -> List[str]:
        """
        Use GPT to generate targeted search queries for a category
        """
        prompt = f"""
Generate 5 Google search queries to find scholarship opportunities in the {category} industry.

Focus on:
- Company scholarships
- Professional association scholarships
- Industry-specific scholarships
- Lesser-known opportunities

Keywords to incorporate: {', '.join(keywords)}

Return ONLY the search queries, one per line, without numbering or explanation.
"""

        response = self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a scholarship research assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )

        queries = response.choices[0].message.content.strip().split('\n')
        return [q.strip().strip('"').strip("'") for q in queries if q.strip()]

    def search_google(self, query: str, num_results: int = 10) -> List[Dict]:
        """
        Search Google using Custom Search API
        """
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.google_api_key,
            'cx': self.google_cx,
            'q': query,
            'num': num_results
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            results = []
            for item in data.get('items', []):
                results.append({
                    'title': item.get('title'),
                    'url': item.get('link'),
                    'snippet': item.get('snippet')
                })

            return results
        except Exception as e:
            print(f"⚠️  Google search error: {e}")
            return []

    def verify_scholarship_page(self, url: str, html: str) -> bool:
        """
        Use AI to verify if a page actually contains scholarship information
        """
        # Extract text content
        soup = BeautifulSoup(html, 'html.parser')

        # Remove scripts, styles, etc.
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        text = soup.get_text(separator=' ', strip=True)
        text = ' '.join(text.split())[:3000]  # Limit to 3000 chars

        prompt = f"""
Analyze this webpage text and determine if it describes a scholarship, grant, or financial aid opportunity.

URL: {url}
Text: {text}

Respond with ONLY "YES" or "NO".

YES if:
- Describes a specific scholarship/grant with clear eligibility
- Has application information or deadlines
- Offers financial assistance for education

NO if:
- General scholarship search/database site
- Blog post or news article about scholarships
- Loan information or paid services
- No specific scholarship details
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a scholarship verification assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=10
            )

            answer = response.choices[0].message.content.strip().upper()
            return answer == "YES"
        except Exception as e:
            print(f"⚠️  AI verification error: {e}")
            return False

    def extract_scholarship_data(self, url: str, html: str) -> Optional[Dict]:
        """
        Use AI to extract structured scholarship data from HTML
        """
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text(separator=' ', strip=True)
        text = ' '.join(text.split())[:4000]

        prompt = f"""
Extract scholarship information from this webpage.

URL: {url}
Text: {text}

Return a JSON object with these fields (use null for missing data):
{{
  "name": "Scholarship name",
  "organization": "Organization offering it",
  "min_award": 1000,
  "max_award": 5000,
  "deadline": "YYYY-MM-DD or null",
  "deadline_type": "fixed|rolling|varies",
  "description": "Brief description",
  "eligibility": "Who can apply",
  "requirements": "Application requirements",
  "application_url": "URL to apply",
  "category": "STEM|Business|Healthcare|etc",
  "field_of_study": "Specific field if mentioned",
  "education_level": "Undergraduate|Graduate|High School|etc"
}}

Return ONLY valid JSON, no explanation.
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # More capable for extraction
                messages=[
                    {"role": "system", "content": "You extract scholarship data into JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )

            json_str = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if json_str.startswith('```'):
                json_str = json_str.split('```')[1]
                if json_str.startswith('json'):
                    json_str = json_str[4:]

            data = json.loads(json_str)
            data['url'] = url
            data['source_url'] = url
            data['source_type'] = 'ai_discovery'

            return data
        except Exception as e:
            print(f"⚠️  AI extraction error: {e}")
            return None

    def discover_scholarships(self, category: str, keywords: List[str],
                            max_results: int = 50) -> List[Dict]:
        """
        Main discovery pipeline for a category
        """
        print(f"\n🔍 Discovering {category} scholarships...")

        # 1. Generate search queries
        queries = self.generate_search_queries(category, keywords)
        print(f"   Generated {len(queries)} search queries")

        scholarships = []
        urls_checked = set()

        # 2. Search and verify
        for query in queries[:3]:  # Limit to 3 queries per category
            print(f"   Searching: {query}")
            search_results = self.search_google(query, num_results=10)

            for result in search_results:
                url = result['url']

                if url in urls_checked or len(scholarships) >= max_results:
                    continue

                urls_checked.add(url)

                # Fetch page
                try:
                    response = requests.get(url, timeout=10, headers={
                        'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)'
                    })
                    html = response.text

                    # Verify it's a scholarship page
                    if not self.verify_scholarship_page(url, html):
                        continue

                    # Extract data
                    data = self.extract_scholarship_data(url, html)
                    if data:
                        scholarships.append(data)
                        print(f"   ✅ Found: {data.get('name')}")
                except Exception as e:
                    print(f"   ⚠️  Error fetching {url}: {e}")
                    continue

        print(f"   Total found: {len(scholarships)}")
        return scholarships
