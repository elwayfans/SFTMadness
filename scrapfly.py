from scrapfly import ScrapeConfig, ScrapflyClient, ScrapeApiResponse

scrapfly = ScrapflyClient(key='scp-live-59b6ef524e7e44ad9a8791a9ac460e98')

api_response:ScrapeApiResponse = scrapfly.scrape(
    scrape_config=ScrapeConfig(url='https://www.uvu.edu/')
    
    )

# Automatic retry errors marked "retryable" and wait delay recommended before retrying
api_response:ScrapeApiResponse = scrapfly.resilient_scrape(scrape_config=ScrapeConfig(url='https://www.uvu.edu/'))

# Automatic retry error based on status code
api_response:ScrapeApiResponse = scrapfly.resilient_scrape(scrape_config=ScrapeConfig(url='https://www.uvu.edu/status/500'), retry_on_status_code=[500])

# scrape result, content, iframes, response headers, response cookies states, screenshots, ssl, dns etc
#print(api_response.scrape_result)

# html content
print(api_response.scrape_result['content'])

#Save to file
file = open('scrape1.txt', 'w')
file.write(api_response.scrape_result['content'])
file.close()