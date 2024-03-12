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
 * @param {boolean} headless - Toggles if the browser will start with no GUI (hidden)
 * @param {string} [proxy] - Optional proxy URL to use for the connection.
 * @returns {Promise<{success: boolean, code: integer|undefined, error: string|undefined, errormessage: string|undefined, json: Array|undefined, header: string|undefined, cf_clearence: string|undefined, dataDir: string|undefined, port: integer|undefined}>} 
 *          A promise that resolves with the result of the CloudFreed process. If successful, 
 *          it returns an object with properties success (boolean), code (integer), and header (string). 
 *          If an error occurs, it returns an object with properties success (boolean), code (integer), 
 *          error (string or undefined), and errormessage (string).
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
async function CloudFreed(url, headless, proxy) {
  let chromeProcess;
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
        errormessage: "Error occurred on our side: Chrome is not installed on the server, please try again later."
      }
    }

    const cloudflareBypassDir = path.join(homedir(), 'CloudFreed');

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
    chromeProcess = await spawn("C:/Program Files/Google/Chrome/Application/Chrome.exe", chromeArgs, {
      detached: true,
      windowsHide: headless
    });

    console.log('PID:', chromeProcess.pid)

    // Fetch Chrome version information
    const versionInfo = await CheckDebuggingEndpoint(port);

    // If WebSocket debugger URL is available, establish WebSocket connection
    if (versionInfo['webSocketDebuggerUrl']) {
      const websocket = versionInfo['webSocketDebuggerUrl'];

      // Create a Promise that resolves when WebSocket communication is done
      const websocketPromise = new Promise(async (resolve, reject) => {
        try {
          const ws = new WebSocket(websocket);
          const solved = await WSManager(ws, url, agent);
          if (chromeProcess) KillProcess(chromeProcess.pid);
          solved["dataDir"] = dataDir
          solved["port"] = port
          resolve(solved);
        } catch (error) {
          if (chromeProcess) KillProcess(chromeProcess.pid);

          reject(error);
        }
      });

      // Use Promise.race() to handle timeout
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(new Error('Timeout occurred'));
        }, 90000); // 90 seconds timeout
      });

      // Wait for either websocketPromise or timeoutPromise to resolve
      const result = await Promise.race([websocketPromise, timeoutPromise]);

      // If result is from timeoutPromise, return timeout error
      if (result instanceof Error && result.message === 'Timeout occurred') {
        // Kill Chrome process
        if (chromeProcess) KillProcess(chromeProcess.pid);

        return {
          success: false,
          code: 500,
          errormessage: "Error occurred on our side: Chrome process took too long to respond, this can be because your proxy is blacklisted or your proxy is WAY TOO FUCKING SLOW."
        };
      }

      // Delay before killing Chrome process
      await delay(500);

      // Terminate Chrome process
      if (chromeProcess) KillProcess(chromeProcess.pid);

      return result;
    } else {
      if (chromeProcess) KillProcess(chromeProcess.pid);

      return {
        success: false,
        code: 500,
        errormessage: "Error occurred on our side: WebSocket debugger URL is not available."
      }
    }

  } catch(error) {
    if (chromeProcess) KillProcess(chromeProcess.pid);

    return {
      success: false,
      code: 500,
      error,
      errormessage: "Error occurred on our side: " + error.message
    }
  }
}

export default CloudFreed;
