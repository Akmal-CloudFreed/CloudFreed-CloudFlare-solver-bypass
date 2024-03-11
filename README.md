# CloudFreed

## Introduction
CloudFreed is a powerful tool designed to bypass Cloudflare anti-bot protection, allowing users to access websites without being restricted by captchas or Cloudflare's security measures.

## Installation
Before using CloudFreed, ensure that you have Node.js installed on your system. If not, you can download and install it from [Node.js website](https://nodejs.org/).

Once Node.js is installed, follow these steps to set up CloudFreed:

1. Clone or download the CloudFreed repository to your local machine.
2. Extract the file.
3. Open a terminal and navigate to the directory where you have cloned/downloaded CloudFreed.
4. Run the following command to install dependencies:

    ```
    npm i
    ```
    alternatively, you can use:
    ```
    npm install
    ```
## Usage
After installing dependencies, you can start using CloudFreed. The main functionality is provided through the `CloudFreed` function, which returns the `cf_clearence` cookie necessary for bypassing Cloudflare protection.

To use CloudFreed in your project, follow these steps:

1. Open the `server.js` file located in the CloudFreed directory.
2. Import the `CloudFreed` function into your project.
3. Call the `CloudFreed` function with the desired URL as an argument. This function will return the `cf_clearence` cookie.
4. Use the `cf_clearence` cookie in your HTTP requests to the target website to bypass Cloudflare protection.

### Example:
```javascript
const CloudFreed = require('./CloudFreed'); // Import CloudFreed function

// Example usage
import CloudFreed from "./CloudFreed.js";
import puppeteer from "puppeteer"

const url = "bloxmoon.com"

const cf = await CloudFreed(url)

const browser = await puppeteer.connect({ browserWSEndpoint: cf.ws })

const pages = await browser.pages()

const page = pages[0]

page.setViewport({
   width: 1024,
   height: 1024,
   deviceScaleFactor: 1
})

page.reload()

// do as you with with your cloudflare bypassed browser!
```

## Note
CloudFreed is intended for educational and research purposes only. Please use it responsibly and respect the terms of service of the websites you visit.
