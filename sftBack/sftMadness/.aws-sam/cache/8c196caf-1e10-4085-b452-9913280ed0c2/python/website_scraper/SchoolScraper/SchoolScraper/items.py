# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class SchoolscraperItem(scrapy.Item):
    # define the fields for your item here like:
    # name = scrapy.Field()
    url = scrapy.Field()      # URL of the page
    domain = scrapy.Field()   # Domain of the page
    text = scrapy.Field()     # Extracted text content
    pass
