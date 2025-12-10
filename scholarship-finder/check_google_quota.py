#!/usr/bin/env python3
"""
Check Google API quota usage
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

def check_google_quota():
    """Check Google Custom Search API quota usage"""
    
    api_key = os.getenv('GOOGLE_API_KEY')
    cse_id = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')
    
    if not api_key:
        print("❌ GOOGLE_API_KEY not found in environment variables")
        return
    
    if not cse_id:
        print("❌ GOOGLE_CUSTOM_SEARCH_CX not found in environment variables")
        return
    
    print("🔍 Checking Google Custom Search API quota...")
    
    # Make a test request to check quota
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        'key': api_key,
        'cx': cse_id,
        'q': 'test query',
        'num': 1
    }
    
    try:
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            print("✅ API key is valid")
            
            # Check response headers for quota info
            headers = response.headers
            print(f"\n📊 Quota Information:")
            print(f"  Quota Limit: {headers.get('X-RateLimit-Limit', 'Unknown')}")
            print(f"  Quota Remaining: {headers.get('X-RateLimit-Remaining', 'Unknown')}")
            print(f"  Quota Reset: {headers.get('X-RateLimit-Reset', 'Unknown')}")
            
        elif response.status_code == 429:
            print("❌ Rate limited (429) - You've hit the quota limit")
            
            # Try to get more details from response
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', {}).get('message', 'Unknown error')}")
            except:
                print("  Could not parse error details")
                
        elif response.status_code == 403:
            print("❌ Forbidden (403) - Check your API key and CSE ID")
            
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', {}).get('message', 'Unknown error')}")
            except:
                print("  Could not parse error details")
                
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"❌ Error checking quota: {e}")

def check_google_quota_daily():
    """Check daily quota limits"""
    
    print("\n📅 Google Custom Search API Daily Limits:")
    print("  Free tier: 100 queries per day")
    print("  Paid tier: 10,000 queries per day")
    print("\n💡 To check your current usage:")
    print("  1. Go to Google Cloud Console")
    print("  2. Navigate to APIs & Services > Dashboard")
    print("  3. Find 'Custom Search API'")
    print("  4. Check the 'Quotas' tab")
    print("\n🔧 To increase limits:")
    print("  1. Enable billing in Google Cloud Console")
    print("  2. Request quota increase for Custom Search API")
    print("  3. Or upgrade to paid tier")

if __name__ == "__main__":
    check_google_quota()
    check_google_quota_daily()
