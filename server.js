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

