from pathlib import Path

import scrapy

class SchoolSpider(scrapy.Spider):
    name = "schools"
    
    def start_requests(self):
        urls = [
            'https://www.neumont.edu/',
            'https://www.neumont.edu/degrees',
            'https://www.neumont.edu/bscs',
            'https://www.neumont.edu/bsgd',
            'https://www.neumont.edu/bsaai',
            'https://www.neumont.edu/bsis',
            'https://www.neumont.edu/bsaie',
            'https://www.neumont.edu/bsse',
            'https://masters.neumont.edu/',
        ]
        for url in urls:
            yield scrapy.Request(url=url, callback=self.parse)
        
    def parse(self, response):
        # print what the spider is doing
        print(response.url)

        a_selectors = response.xpath("//a")

        page = response.url.rstrip("/").split("/")[-1]  # Extracts the last part of the URL
        if not page or "." in page:  # Handle cases where last part is empty or has a file extension
            page = "home"
        filename = f"school-{page}.html"
        Path(filename).write_bytes(response.body)
        self.log(f'Saved file {filename}')