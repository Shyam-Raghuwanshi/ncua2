const { Actor, ApifyClient } = require("apify");
const { PlaywrightCrawler, Dataset } = require("crawlee");

Actor.main(async () => {
    const { router } = require("./routes.js");
    const startUrls = [
        "https://ncua.gov/news/publications-reports",
    ];

    // const proxyConfiguration = await Actor.createProxyConfiguration();

    const crawler = new PlaywrightCrawler({
        maxConcurrency: 3,
        launchContext: {
            launchOptions: { javaScriptEnabled: false },
        },
        failedRequestHandler: async ({ request, log }, error) => {
            log.error(`Request to: ${request.url} failed...`);
            const DataSetError = await Dataset.open("Error");
            await DataSetError.pushData({
                url: request.url,
				Docket: "Null",
				Date: "Null",
				Category: "Letters to Credit Unions & Other Guidance",
				Doc_Type: "PDF",
				Title: "Null",
				Page_Number: "Null",
				Page_Content: `Error fetching : ${error}`,
				Links: [{
					linkText: "Null",
					link: "Null",
					innerText: "null",
					Inner_Links: "null",
					Inner_PDFs: "null"
				}],
				PDFs: [{
					linkText: "Null",
					link: "Null",
					Docket: "Null",
					Date: "Null",
					Category: "Null",
					Doc_Type: "PDF",
					Title: "Null",
					Page_Number: "Null",
					Page_Content: "Null",
				}]
            });
        },
        maxRequestRetries: 1,
        requestHandler: router,
        requestHandlerTimeoutSecs: 300,
        navigationTimeoutSecs: 300,
    });

    await crawler.run(startUrls);
    // await Dataset.exportToCSV("OUTPUT");
    // await Dataset.exportToJSON("OUTPUT");
});
