// const puppeteer = require('puppeteer');

// async function scrapeWebsite(url) {
//     const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
//     const page = await browser.newPage();
//     await page.goto(url);

//     // Get all hrefs on the page
//     const hrefs = await page.$$eval('a', links => links.map(link => link.href));

//     // Save the page source to a file
//     const fs = require('fs');
//     fs.writeFile('output.txt', await page.content(), err => {
//         if (err) throw err;
//     });

//     // Navigate to each href and save the page source
//     for (let i = 0; i < hrefs.length; i++) {
//         await page.goto(hrefs[i]);
//         fs.writeFile(`output_${i}.txt`, await page.content(), err => {
//             if (err) throw err;
//         });
//     }

//     await browser.close();
// }

// // Usage
// scrapeWebsite('https://www.cliniops.com');
