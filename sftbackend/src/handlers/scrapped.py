from fastapi import APIRouter, Request, HTTPException, Depends, Body
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from collections import deque
import requests
import re
from src.validate import validate_token

router = APIRouter()

@router.post("/scrapeCollegeData")
def scrape_college_data(
    body: dict = Body(...),
    token_payload: dict = Depends(validate_token)  # Enforces authentication
):
    try:
        start_url = body.get('url')
        pages = body.get('pages', 10)
        if not start_url or not start_url.startswith('http'):
            raise HTTPException(status_code=400, detail="Invalid or missing URL")

        max_pages = pages
        visited = set()
        queue = deque([start_url])
        amount_results = []

        domain = urlparse(start_url).netloc
        headers = {'User-Agent': 'Mozilla/5.0'}

        while queue and len(visited) < max_pages:
            url = queue.popleft()
            if url in visited:
                continue
            visited.add(url)

            try:
                res = requests.get(url, headers=headers, timeout=10)
                if res.status_code != 200:
                    continue

                soup = BeautifulSoup(res.text, 'html.parser')
                text = soup.get_text(separator=' ', strip=True)

                # Match $ amounts
                dollar_matches = list(re.finditer(r'\$[0-9,]+(?:\.\d{2})?', text))

                for match in dollar_matches:
                    amount = match.group()
                    start_idx = max(int(match.start()) - 50, 0)
                    end_idx = min(int(match.end()) + 50, len(text))
                    context = str(text[start_idx:end_idx])

                    amount_results.append({
                        "url": url,
                        "amount": amount,
                        "context": context.strip()
                    })

                # Collect and prioritize internal links
                internal_links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    joined_url = urljoin(url, href)
                    parsed = urlparse(joined_url)
                    if parsed.netloc == domain and joined_url not in visited:
                        internal_links.append(joined_url)

                # Prioritize tuition-related links
                priority_keywords = ['tuition', 'cost', 'fee', 'financial-aid']
                def link_priority(link):
                    for i, keyword in enumerate(priority_keywords):
                        if keyword in link.lower():
                            return i
                    return len(priority_keywords)

                prioritized_links = sorted(internal_links, key=link_priority)
                for link in prioritized_links:
                    queue.append(link)

            except Exception:
                continue  # Skip on error

        return {
            "startUrl": start_url,
            "pagesScanned": len(visited),
            "dollarAmountsFound": amount_results,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
