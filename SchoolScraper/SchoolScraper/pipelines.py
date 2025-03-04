# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface

# pipelines.py
class ListCollectorPipeline:
    def __init__(self):
        self.items = []  # List to store scraped items

    def process_item(self, item, spider):
        self.items.append(item)  # Add each item to the list
        return item