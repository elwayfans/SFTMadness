from pathlib import Path
from urllib.parse import urlparse, urljoin
import scrapy
from scrapy.crawler import CrawlerProcess
from bs4 import BeautifulSoup

class SchoolSpider(scrapy.Spider):
    name = "schools"
    visited_urls = set()  # Track visited URLs to avoid duplicates

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                meta={
                    "playwright": True,
                    "playwright_include_page": True,  # Include the Playwright page object
                },
            )

    async def parse(self, response):
        # Access the Playwright page object
        page = response.meta["playwright_page"]

        # Wait for the page to load completely
        await page.wait_for_selector("body")

        # Extract the page content after JavaScript rendering
        content = await page.content()

        # Close the Playwright page
        await page.close()

        # Use BeautifulSoup to parse the HTML and extract text
        soup = BeautifulSoup(content, "html.parser")

        # Extract all text content
        cleaned_text = soup.get_text(separator=" ", strip=True)

        # Save the extracted text to a file
        domain = urlparse(response.url).netloc  # Extract domain name
        page = response.url.replace("http://", "").replace("https://", "").replace("/", "_")
        filename = f"{domain}_{page}.txt"  # Unique filename for text content
        Path(filename).write_text(cleaned_text)
        self.log(f"Saved text content to {filename}")

        # Extract all links from the page
        for link in soup.find_all("a", href=True):
            href = link["href"]
            full_url = urljoin(response.url, href)  # Resolve relative URLs

            # Filter URLs to ensure they belong to the allowed domain
            if self.allowed_domains[0] in full_url and full_url not in self.visited_urls:
                self.visited_urls.add(full_url)  # Mark URL as visited
                yield scrapy.Request(
                    full_url,
                    callback=self.parse,
                    meta={
                        "playwright": True,
                        "playwright_include_page": True,  # Include the Playwright page object
                    },
                )

def start_scrape():
    process = CrawlerProcess(settings={
        "PLAYWRIGHT_BROWSER_TYPE": "chromium",  # Use Chromium as the browser
        "DOWNLOAD_HANDLERS": {
            "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
        "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
    })
    process.crawl(SchoolSpider, start_urls=[
        'https://www.neumont.edu/',
        'https://www.neumont.edu/degrees',
        'https://www.neumont.edu/bscs',
        'https://www.neumont.edu/bsgd',
        'https://www.neumont.edu/bsaai',
        'https://www.neumont.edu/bsis',
        'https://www.neumont.edu/bsaie',
        'https://www.neumont.edu/bsse',
        'https://masters.neumont.edu/',
    ], allowed_domains=['neumont.edu'])
    process.start()

if __name__ == "__main__":
    # Proper user loop
    while True:
        user_message = input(">: ")
        if user_message == "scrape":
            start_scrape()