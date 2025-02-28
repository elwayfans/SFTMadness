import scrapy
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from SchoolScraper.items import SchoolscraperItem

class SchoolSpider(scrapy.Spider):
    name = "schools"
    visited_urls = set()  # Track visited URLs to avoid duplicates

    def __init__(self, start_urls=None, allowed_domains=None, *args, **kwargs):
        super(SchoolSpider, self).__init__(*args, **kwargs)
        self.start_urls = start_urls or []  # Mutable start URLs
        self.allowed_domains = allowed_domains or []  # Mutable allowed domains
        self.link_extractor = scrapy.linkextractors.LinkExtractor(allow_domains=self.allowed_domains)

    def start_requests(self):
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                meta={
                    "playwright": True,
                    "playwright_include_page": True,
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
        cleaned_text = soup.get_text(separator=" ", strip=True)

        # Create an item and populate it with data
        item = SchoolItem()
        item["url"] = response.url
        item["domain"] = urlparse(response.url).netloc
        item["text"] = cleaned_text

        # Yield the item to the pipeline
        yield item

        # Extract all links from the page using LinkExtractor
        links = self.link_extractor.extract_links(response)
        for link in links:
            full_url = link.url
            if full_url not in self.visited_urls:
                self.visited_urls.add(full_url)
                yield scrapy.Request(
                    full_url,
                    callback=self.parse,
                    meta={
                        "playwright": True,
                        "playwright_include_page": True,
                    },
                )