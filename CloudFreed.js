import ValidateURL from "./lib/ValidateURL.js"
import Test from "./lib/Test.js"
import DeleteTempUserDataFolders from "./lib/DeleteTempUserDataFolders.js"
import FindAvailablePort from "./lib/FindAvailablePort.js"
import CheckDebuggingEndpoint from "./lib/CheckDebuggingEndpoint.js"
import WSManager from "./lib/WSManager.js"
import KillProcess from "./lib/KillProcess.js"
import { homedir } from 'os';
import fs from 'fs/promises';
import WebSocket from "ws"
import { spawn } from "child_process"
import path from 'path';
import { fileURLToPath } from 'url';

var __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Introduce a delay.
 * @param {number} milliseconds - The duration of the delay in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Initiates CloudFreed process to bypass Cloudflare protection.
 * @param {string} url - The URL protected by Cloudflare anti-bot.
 * @param {string} [proxy] - Optional proxy URL to use for the connection.
 * @returns {Promise<Object>} - A promise that resolves with the result of CloudFreed process.
 *                              The resolved object contains success status and additional data.
 * @throws {Error} - Throws an error if any critical error occurs during the CloudFreed process.
 * @example
 * // Example usage:
 * CloudFreed('https://example.com')
 *   .then(result => {
 *     console.log(result);
 *   })
 *   .catch(error => {
 *     console.error(error);
 *   });
 */
async function CloudFreed(url, proxy, headless) {
  try {
    url = ValidateURL(url)

    const test = await Test(url, proxy)

    if (test.invalidProxyType || test.invalidProxy || (proxy && !test.proxyWorks)) {
      let errorMessage = "Invalid proxy, please make sure it's a http, https, or SOCKS proxy.\nExamples: http://proxy:port, https://proxy:port, socks5://proxy:port";
    
      if (test.invalidProxyType) {
        errorMessage = "Invalid proxy type, " + errorMessage;
      } else if (!test.proxyWorks) {
        errorMessage = "Proxy doesn't work, " + errorMessage;
      }
    
      return {
        success: false,
        code: 403,
        errormessage: errorMessage
      };
    }
    
    if (!test.cloudflareProtected) {
      return {
        success: false,
        code: 403,
        errormessage: "URL is not protected by Cloudflare anti-bot."
      };
    }

    if (typeof headless !== 'boolean' && headless !== undefined) {
      return {
        success: false,
        code: 403,
        errormessage: "Invalid headless option. (can be blank, true, or false)"
      };
    }

    const agent = proxy ? test.proxyAgent : undefined

    if (!(await fs.stat("C:/Program Files/Google/Chrome/Application/chrome.exe"))) {
      console.error("Chrome is not installed. Please install Chrome and try again.");
      return {
        success: false, 
        code: 500,
        errormessage: "Error occured on our side: Chrome is not installed on server, please try again later."
      }
    }

    const cloudflareBypassDir = path.join(homedir(), 'cf-bypass');

    // Delete temporary user data folders
    await DeleteTempUserDataFolders(cloudflareBypassDir);

    // Find an available port
    const port = await FindAvailablePort(10000, 60000);
    const dataDir = path.join(cloudflareBypassDir, `tempUserData_${Date.now()}`);

    // Configure Chrome arguments
    const chromeArgs = [
      `--user-data-dir=${dataDir}`,
      '--window-size=1024,1024',
      `--remote-debugging-port=${port}`,
      `--load-extension=${path.join(__dirname, "CloudFreed Extension")}`,
      `--window-name=CloudFreed`,
      '--allow-file-access-from-files',
      `--app=file:///${path.join(__dirname, "html", "CloudFreed.html")}`,
    ];

    // Launch Chrome in headless mode
    const chromeProcess = await spawn("C:/Program Files/Google/Chrome/Application/Chrome.exe", chromeArgs, {
      detached: true,
      windowsHide: headless
    });
    
    console.log('PID:', chromeProcess.pid)

    // Fetch Chrome version information
    const versionInfo = await CheckDebuggingEndpoint(port);

    // If WebSocket debugger URL is available, establish WebSocket connection
    if (versionInfo['webSocketDebuggerUrl']) {
      const websocket = versionInfo['webSocketDebuggerUrl'];
      const ws = new WebSocket(websocket);
      const solved = await WSManager(ws, url, agent);

      console.log('WebSocket communication done!')

      // Delay before killing Chrome process
      await delay(500);

      // Terminate Chrome process
      KillProcess(chromeProcess.pid)

      return solved;
    } else {
      return {
        success: false,
        code: 500,
        errormessage: "Eror occured on our side, please check your request or try again later."
      }
    }

  } catch(error) {
    return {
      success: false,
      code: 500,
      error,
      errormessage: "Eror occured on our side, please check your request or try again later."
    }
  }
}

export default CloudFreed