const { Dataset, createPlaywrightRouter } = require("crawlee");
const pdfParse = require("pdf-parse");
const router = createPlaywrightRouter();
const { load } = require("cheerio");

router.addDefaultHandler(async ({ request, page, enqueueLinks, log }) => {
	const title = await page.title();
	log.info(`${title}`, { url: request.loadedUrl });
	x = title;
	await enqueueLinks({
		selector: "#edit-next-container a",
	});

	await enqueueLinks({
		selector: "tbody tr td a",
		label: "detail",
		transformRequestFunction(request) {
			if (request.url.endsWith(".pdf")) {
				log.info(`PDF ${request.url}`);
				fetchPDF(request.url);
				return false;
			} else {
				return request;
			}
		},
	});
	async function fetchPDF(pdfLink) {
		const { default: fetch } = await import("node-fetch");
		try {
			const response = await fetch(pdfLink);
			const buffer = await response.arrayBuffer();
			const pdfText = await pdfParse(buffer);
			const numPages = pdfText.numpages;
			const pagesText = pdfText.text.split("\n\n");

			const pdfTextWithPages = [];
			for (let i = 1; i <= numPages; i++) {
				pdfTextWithPages.push({
					Page_Number: i,
					Page_Content: pagesText[i],
				});
			}

			let title = "Null";
			for (let i = 0; i < pdfTextWithPages.length; i++) {
				const firstLine =
					pdfTextWithPages[i].Page_Content.trim().split("\n")[0];
				if (firstLine) {
					title = firstLine;
					break;
				}
			}

			const docketRegex = /No.\s*([^,\n]{1,10})/i;
			const docketMatch = pdfText.text.match(docketRegex);
			const docket = docketMatch ? docketMatch[1].trim() : "Null";

			const dateRegex = /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[\d]{1,2}(?:\s*,\s*[\d]{4})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/i;
			const dateMatch = pdfText.text.match(dateRegex);
			let date = "Null";

			if (dateMatch) {
				date = dateMatch[0].trim();
				// If the date format is "month year", extract the year from the text
				if (date.match(/\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i)) {
					const yearMatch = date.match(/\d{4}/i);
					date = yearMatch ? yearMatch[0] : date;
				}
			}
			const DataSetError = await Dataset.open(`LettersToCreditUnionsAndOtherGuidancePDFData`);
			await DataSetError.pushData({
				url: pdfLink,
				Docket: docket,
				Date: date,
				Category: "Letters to Credit Unions & Other Guidance",
				Doc_Type: "PDF",
				Title: title,
				Page_Number: numPages,
				Page_Content: pdfTextWithPages,
				Links: [{
					linkText: "Null",
					link: "Null",
					Category : "Letters to Credit Unions & Other Guidance",
					innerText: "Null",
					Inner_Links: "Null",
					Inner_PDFs_Links: "Null",
					PdfDataArray : "Null"
				}],
				PDFs: [{
					linkText: "Null",
					link: "Null",
					Docket: "Null",
					Date: "Null",
					Category: "Letters to Credit Unions & Other Guidance",
					Doc_Type: "PDF",
					Title: "Null",
					Page_Number: "Null",
					Page_Content: "Null",
				}]
			})
		} catch (error) {
			const DataSetError = await Dataset.open(`LettersToCreditUnionsAndOtherGuidancePDFData`);
			await DataSetError.pushData({
				url: pdfLink,
				Docket: "Null",
				Date: "Null",
				Category: "Letters to Credit Unions & Other Guidance",
				Doc_Type: "PDF",
				Title: "Null",
				Page_Number: "Null",
				Page_Content: `Error fetching or parsing PDF from ${pdfLink} and ${error}`,
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
			})
		}
	}
});

router.addHandler("detail", async ({ request, page, log }) => {
	try {
		const title = await page.title();
		const url = request.loadedUrl;
		log.info(`${title}`, { url });
		const result = await page.evaluate(() => {
			const result = {
				Docket:
					document.querySelector("span[class*=docket]")
						?.innerText || "N/A",
				Date:
					document.querySelector("span[class*=date]")
						?.innerText || "N/A",
				Category:
					document.querySelector(
						"a[href*=letters-credit-unions-other-guidance]"
					)?.innerText || "N/A",
				Doc_Type:
					"Web Page",
				Title:
					document.querySelector(".pseudo-title")?.innerText ||
					"N/A",
				Page_Number: 1,
				Page_Content:
					document.querySelector(".row.no-gutters .body")
						?.innerText || "N/A",
				Links: [],
				PDFs: [],
			};

			const linkElements = document.querySelectorAll(
				".row.no-gutters .body a"
			);
			for (const el of Array.from(linkElements)) {
				const obj = {
					linkText: el.innerText || "N/A",
					link: el.href || "",
				};
				const numericValue = Number(obj.linkText);
				if (
					isNaN(numericValue) &&
					!obj.link.includes("mailto") &&
					obj.link !== ""
				) {
					if (obj.link.endsWith(".pdf")) {
						result.PDFs.push(obj);
					} else result.Links.push(obj);
				}
			}

			return result;
		});

		const Links = (
			await Promise.allSettled(
				result.Links.map(
					(link) =>
						new Promise(async (res, rej) => {
							try {
								// let innerTitle;
								if (!link.link.includes(".pdf")) {
									const FederalRegisterResponse =
										await page.request.fetch(link.link);
									const $ = load(
										await FederalRegisterResponse.text()
									);
									const contentDiv = $(".layout-content");
									Inner_Links = contentDiv
										.find("a")
										.map((i, el) => $(el).attr("href"))
										.get();
									Inner_Links = Inner_Links.map(
										(innerLink) => {
											if (
												!innerLink.startsWith(
													"http"
												)
											) {
												return (
													"https://ncua.gov" +
													innerLink
												);
											}
											return innerLink;
										}
									);
									Inner_Links = Array.from(
										new Set(Inner_Links)
									);
									Inner_PDFs_Links = Inner_Links.filter((link) =>
										link.endsWith(".pdf")
									);
									Inner_Links = Inner_Links.filter(
										(link) => !link.endsWith(".pdf")
									);
									Inner_Links = Inner_Links.filter(
										(link) =>
											!link.endsWith("@ncua.gov")
									);
									Inner_Links = Inner_Links.filter(
										(link) => !link.includes("#ftn")
									);
									InnerText = $("p").text();
								}
								res({
									...link,
									Category: "Letters to Credit Unions & Other Guidance",
									InnerText,
									Inner_Links,
									Inner_PDFs_Links,
								});
							} catch (e) {
								// console.log(e);
								res({
									...link,
									Category: "Letters to Credit Unions & Other Guidance",
									InnerText:"Null",
									Inner_Links:[],
									Inner_PDFs_Links :[],
									PdfDataArray:[],
									error: "404 page not found",
								});
							}
						})
				)
			)
		).map((p) => p.value);

		if (Links.length === 0) {
			Links.push({
				linkText: "Null",
				link: "Null",
				Category: "Letters to Credit Unions & Other Guidance",
				InnerText:"Null",
				Inner_Links:[],
				Inner_PDFs_Links :[],
				PdfDataArray:[]
			});
		}

		const InnerPDFs = (
			await Promise.allSettled(
				Links.map(
					(pdf) =>
						new Promise(async (res, rej) => {
							try {
								const PdfDataArray = [];

								// Loop through all the PDF links in the `Inner_PDFs_Links` array
								for (const pdfLink of pdf.Inner_PDFs_Links) {
									try {
										// Fetch the PDF content from the current link
										const link = pdfLink;
										const pdfResponse =
											await page.request.fetch(
												pdfLink
											);

										// Parse the fetched PDF using pdf-parse
										const pdfText = await pdfParse(
											(
												await pdfResponse.body()
											).buffer
										);
										const numPages = pdfText.numpages;
										const pagesText =
											pdfText.text.split("\n\n"); // Assuming \f (form feed) separates pages

										// Prepare the array to hold text with page numbers
										const pdfTextWithPages = [];
										for (
											let i = 1;
											i <= numPages;
											i++
										) {
											pdfTextWithPages.push({
												Page_Number: i,
												Page_Content: pagesText[i],
											});
										}
										// Store the parsed information for this PDF
										PdfDataArray.push({
											link,
											Page_Number: numPages,
											Page_Content: pdfTextWithPages,
										});
									} catch (innerError) {
										PdfDataArray.push({
											link: pdfLink,
											error:
												innerError.message ||
												innerError.code ||
												true,
										});
									}
								}

								res({
									...pdf,
									PdfDataArray,
								});
							} catch (e) {
								// console.log(e);
								res({
									...pdf,
									error: e.message || e.code || true,
								});
							}
						})
				)
			)
		).map((p) => p.value);


		const pdfjsLib = require('pdfjs-dist');

		async function extractText(url) {
			return new Promise((resolve, reject) => {
				pdfjsLib.getDocument(url).promise.then(async function (pdf) {
					let pdfTextWithPages = [];
					let plainText = '';

					// Loop through each page
					for (let Page_Number = 1; Page_Number <= pdf.numPages; Page_Number++) {
						const page = await pdf.getPage(Page_Number);
						const textContent = await page.getTextContent();

						// Extract text
						let pageText = '';
						textContent.items.forEach(function (item) {
							pageText += item.str + ' ';
						});

						// Add the page number and text to the result array
						pdfTextWithPages.push({
							Page_Number: Page_Number,
							Page_Content: pageText.trim(),
						});

						plainText += pageText + '\n';
					}

					resolve({
						numPages: pdf.numPages,
						pages: pdfTextWithPages,
						content: plainText.trim(),
					});
				}).catch(function (error) {
					reject('Error: ' + error);
				});
			});
		}

		const PDFs = (
			await Promise.allSettled(
				result.PDFs.map(
					(pdf) =>
						new Promise(async (res, rej) => {
							try {
								const textContent = await extractText(pdf.link);

								const mainText = textContent.pages;
								const Page_Numbers = textContent.numPages;
								const plainText = textContent.content;

								const docketRegex = /(?:\[Docket No. \]|Docket No: |No: |SL No: |RIN )\s*([^,]{1,10})/i; // Capture upto 10 characters
								const docketMatch = plainText.match(docketRegex);
								const docket = docketMatch ? docketMatch[1].trim() : "Null";

								const dateRegex = /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+[\d]{1,2}(?:\s*,\s*[\d]{4})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/i;
								const dateMatch = plainText.match(dateRegex);
								let date = "Null";

								if (dateMatch) {
									date = dateMatch[0].trim();
									// If the date format is "month year", extract the year from the text
									if (date.match(/\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i)) {
										const yearMatch = date.match(/\d{4}/i);
										date = yearMatch ? yearMatch[0] : date;
									}
								}


								res({
									...pdf,
									Docket: docket,
									Date: date,
									Category: "Letters to Credit Unions & Other Guidance",
									Doc_Type: "PDF",
									Title: pdf.linkText,
									Page_Number: Page_Numbers,
									Page_Content: mainText,
								})

							} catch (e) {
								console.log(e);
								res({
									...pdf,
									Docket: "Null",
									Date: "Null",
									Category: "Letters to Credit Unions & Other Guidance",
									Doc_Type: "PDF",
									Title: pdf.linkText,
									Page_Number: "Null",
									Page_Content: "Null",
									error: e.message || e.code || true,
								});
							}
						})
				)
			)
		).map((p) => p.value);



		if (PDFs.length === 0) {
			PDFs.push({
				linkText: "Null",
				link: "Null",
				Docket: "Null",
				Date: "Null",
				Category: "Letters to Credit Unions & Other Guidance",
				Doc_Type: "PDF",
				Title: "Null",
				Page_Number: "Null",
				Page_Content: "Null",
			});
		}


		// If the request has large data errors, mark the data for manual processing
		if (request.errorMessages.includes("Data item is too large")) {
			const DataSetError = await Dataset.open(`LettersToCreditUnionsAndOtherGuidance`);
			await DataSetError.pushData({
				url: request.url,
				...result,
				PDFs: PDFs.map((item) => ({
					...item,
					text: "Please retrieve manually due to size limitations",
				})),
				Links: Links.map((item) => ({
					...item,
					text: "Please retrieve manually due to size limitations",
				})),
			});
		} else {
			const DataSetError = await Dataset.open(`LettersToCreditUnionsAndOtherGuidance`);
			DataSetError.pushData({
				url: request.url,
				...result,
				PDFs,
			});
			// await Dataset.pushData({	
			// 	url: request.url,
			// 	...result,
			// 	Links: [...InnerPDFs],
			// 	PDFs
			// });
		}
	} catch (error) {
		log.error(
			`An unexpected error occurred: ${error.message || error.code}`
		);
	}
});

module.exports = { router };