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
import CloudFreed from "./CloudFreed.js";
import CheckDebuggingEndpoint from "./lib/CheckDebuggingEndpoint.js"
import { spawn } from "child_process"
import puppeteer from "puppeteer"
import path from 'path';
import { fileURLToPath } from 'url';

var __dirname = path.dirname(fileURLToPath(import.meta.url))

const url = "https://bloxmoon.com"
const headless = false // set to true to hide browsers (saves utilization for CPU/GPU)

// add a string with your http/https/socks proxy if you have one: "192.168.1.4:8188"
const cf = await CloudFreed(url, headless, )

if (cf.success === true) {
  let cf_clearence = cf.json.find(cookie => cookie.key === 'cf_clearance');

  cf_clearence = {
    name: cf_clearence.key,
    value: cf_clearence.value,
    expires: cf_clearence.expires,
    domain: cf_clearence.domain,
    path: cf_clearence.path,
    secure: cf_clearence.secure,
    httpOnly: cf_clearence.httpOnly,
    sameSite: cf_clearence.sameSite
  }

  console.log(JSON.stringify(cf.json), JSON.stringify(cf_clearence))

  // Configure Chrome arguments
  const chromeArgs = [
    `--user-data-dir=${cf.dataDir}`,
    '--window-size=1024,1024',
    `--remote-debugging-port=${cf.port}`,
    `--window-name=CloudFreed`,
    '--allow-file-access-from-files',
    `--app=${url}`,
  ];

  // Launch Chrome in headless mode
  const chromeProcess = await spawn("C:/Program Files/Google/Chrome/Application/Chrome.exe", chromeArgs, {
    detached: true,
    windowsHide: headless
  });

  const versionInfo = await CheckDebuggingEndpoint(cf.port);

  // If WebSocket debugger URL is available, establish WebSocket connection
  if (versionInfo['webSocketDebuggerUrl']) {
    const websocket = versionInfo['webSocketDebuggerUrl'];

    const browser = await puppeteer.connect(
      {
        browserWSEndpoint: websocket
      }
    )

    const pages = await browser.pages()

    const page = pages[0]

    await page.setViewport({
      width: 1024,
      height: 1024,
      deviceScaleFactor: 1
    })
  }
} else {console.log('something goofy happened: '+JSON.stringify(cf))}

// do as you wish with your cloudflare bypassed page!
```

## Note
CloudFreed is intended for educational and research purposes only. Please use it responsibly and respect the terms of service of the websites you visit.
