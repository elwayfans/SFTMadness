# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface

# pipelines.py
class ListCollectorPipeline:
    items = []  # Now it's a class-level list

    def process_item(self, item, spider):
        print(f"Processing item in pipeline: {item}")
        self.items.append(item)  # Store in class variable
        return item