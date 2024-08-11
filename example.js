import CloudFreed from "./index.js"
import puppeteer from "puppeteer";

const shahah = new CloudFreed()

const instance = await shahah.start(false)

console.log(instance)

const test = await instance.SolveIUAM("https://bloxmoon.com")

console.log(test)

const UserAgent = instance.userAgent

instance.Close()

const cf = test.cfClearance;

(async () => {
  // Launch a headless browser
  const browser = await puppeteer.launch({
    headless: false,
    args: [
        `--user-agent=${UserAgent}`
    ]
  });

  // Create a new page
  const page = await browser.newPage();

  // Set a cookie
  await page.setCookie({
    name: cf.name,
    value: cf.value,
    domain: cf.domain,
    path: cf.path,
    httpOnly: cf.httpOnly,
    secure: cf.secure // Replace with the domain of the website
  });

  // Navigate to a website
  await page.goto("https://bloxmoon.com/");
})();
