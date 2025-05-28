from fastapi import APIRouter, HTTPException, Body
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, urldefrag
from collections import deque
import requests
import json
import os

from src.validate import validate_token

router = APIRouter()

@router.post("/scrapeCollegeData")
def scrape_college_data(
    body: dict = Body(...)
):
    token = requests.request.cookies.get("idToken")
    validate_token(token)
    if not token:
        raise HTTPException(status_code=401, detail="Access Denied: No token found")
    try:
        start_url = body.get('url')
        pages = body.get('pages', 20)
        company_name = body.get('companyName')

        if not start_url or not start_url.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid or missing URL")
        if not company_name:
            raise HTTPException(status_code=400, detail="Missing companyName")

        max_pages = min(pages, 20)
        visited = set()
        seen_links = set()
        queue = deque([start_url])
        text_results = []

        domain = urlparse(start_url).netloc
        headers = {'User-Agent': 'Mozilla/5.0'}

        def clean_url(href, base_url):
            """Join and normalize URL, remove fragments."""
            joined = urljoin(base_url, href)
            cleaned, _ = urldefrag(joined)
            return cleaned

        while queue and len(visited) < max_pages:
            url = queue.popleft()
            cleaned_url = clean_url(url, start_url)

            if cleaned_url in visited:
                continue
            visited.add(cleaned_url)

            try:
                res = requests.get(cleaned_url, headers=headers, timeout=10)
                if res.status_code != 200:
                    continue

                soup = BeautifulSoup(res.text, 'html.parser')
                for tag in soup(['script', 'style', 'noscript']):
                    tag.decompose()

                text = soup.get_text(separator=' ', strip=True)
                clean_text = ' '.join(text.replace('\n', ' ').split())[:4000]

                if len(clean_text) > 100:
                    text_results.append({
                        "url": cleaned_url,
                        "text": clean_text
                    })

                internal_links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if href.startswith('#') or not href.strip():
                        continue
                    full_link = clean_url(href, cleaned_url)
                    if (urlparse(full_link).netloc == domain and
                            full_link not in visited and
                            full_link not in seen_links):
                        internal_links.append(full_link)
                        seen_links.add(full_link)

                priority_keywords = ['admissions', 'tuition', 'cost', 'financial-aid', 'campus', 'student-life', 'housing']
                def link_priority(link):
                    for i, keyword in enumerate(priority_keywords):
                        if keyword in link.lower():
                            return i
                    return len(priority_keywords)

                prioritized_links = sorted(internal_links, key=link_priority)
                queue.extend(prioritized_links)

            except Exception:
                continue

        # Save results to the file
        save_dir = os.path.join("/app/shared_data", company_name)
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, "college_knowledge.json")

        with open(save_path, "w", encoding='utf-8') as f:
            json.dump(text_results, f, indent=2, ensure_ascii=False)

        return {
            "startUrl": start_url,
            "pagesScanned": len(visited),
            "savedTo": save_path,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
