import ValidateURL from "./lib/ValidateURL.js";
import GetDefaultChromePath from "./lib/GetDefaultChromePath.js";
import GetHomeDirectory from "./lib/GetHomeDirectory.js";
import delay from "./lib/delay.js";
import DeleteTempUserDataFolders from "./lib/DeleteTempUserDataFolders.js";
import FindAvailablePort from "./lib/FindAvailablePort.js";
import CheckDebuggingEndpoint from "./lib/CheckDebuggingEndpoint.js";
import KillProcess from "./lib/KillProcess.js";
import SolveIUAM from "./lib/SolveIUAM.js";
import SolveTurnstile from "./lib/SolveTurnstile.js";

// Separate library imports from module imports
import CDP from "chrome-remote-interface";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CloudFreed {
  /**
   * Starts a CloudFreed Instance
   * @param {boolean|undefined} headless - Whether the instance should run in headless mode.
   * @param {string|undefined} userAgent - The user agent string to use.
   * @param {Promise<{host: string, port: number, username: string|undefined, password: string|undefined}>|undefined} proxy - An optional proxy configuration.
   */
  async start(headless, userAgent, proxy) {
    let chromeProcess;
    const chromium = GetDefaultChromePath();
    const homedir = GetHomeDirectory();

    try {
      // Check if OS is valid
      if (!chromium && !homedir) {
        return {
          success: false,
          code: 500,
          errormessage: "Unsupported OS, please use darwin, linux, or windows."
        };
      }

      // Check if Chrome is installed or uninstalled/misplaced
      try {
        await fs.access(chromium);
      } catch (error) {
        return {
          success: false,
          code: 500,
          errormessage: `Google Chrome is not installed on host server, please install Google Chrome and try again.\nAttempted path: ${chromium}`
        };
      }

      const cloudflareBypassDir = path.join(homedir, 'CloudFreed');
      await DeleteTempUserDataFolders(path.join(cloudflareBypassDir, 'DataDirs'));

      // Find an available port
      const port = await FindAvailablePort(10000, 60000);
      const dataDir = path.join(cloudflareBypassDir, 'DataDirs', `CloudFreed_${Date.now()}`);
      const EXTENSION_PATH = path.join(__dirname, "lib", "turnstilePatch");

      // Configure Chrome arguments
      const chromeArgs = [
        `--user-data-dir=${dataDir}`,
        '--window-size=512,512',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-gpu',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--no-sandbox',
        '--lang=en',
        '--disable-sync',
        '--process-per-site',
        `--remote-debugging-port=${port}`,
        '--window-name=CloudFreed',
        '--allow-file-access-from-files',
        '--ignore-certificate-errors',
        `--app=file:///${path.join(__dirname, "html", "CloudFreed.html")}`,
      ];

      if (proxy?.host && proxy?.port) {
        console.log("Proxy added:", proxy);
        chromeArgs.push(`--proxy-server=${proxy.host}:${proxy.port}`);
      }

      if (typeof userAgent === "string") {
        chromeArgs.push(`--user-agent="${userAgent}"`);
      }

      // Launch Chrome in headless mode
      chromeProcess = spawn(chromium, chromeArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: headless
      });

      const PID = chromeProcess.pid;
      chromeProcess.unref();

      // Fetch Chrome version information
      const versionInfo = await CheckDebuggingEndpoint(port);

      if (!versionInfo) {
        await KillProcess(PID);
        return {
          success: false,
          code: 500,
          errormessage: "Error occurred on our side: VersionInfo could not be parsed from chrome. returned null."
        };
      }

      // If WebSocket debugger URL is available, establish WebSocket connection
      if (versionInfo.webSocketDebuggerUrl) {
        const websocket = await CDP({ port });

        return {
          success: true,
          code: 200,
          userAgent: versionInfo['User-Agent'],
          webSocketDebuggerUrl: versionInfo.webSocketDebuggerUrl,
          port,

          /**
           * Solves Cloudflare's "I'm Under Attack Mode" challenge.
           * Do NOT use the same instance for more than one challenge at once.
           * @param {string} url - The URL to solve the challenge for.
           * @returns {Promise<{success: boolean, code: number, cfClearance?: Object|undefined}>}
           */
          SolveIUAM: async (url) => {
            url = ValidateURL(url);
            console.log('Solving ' + url);
            const response = await SolveIUAM(websocket, url, path.join(__dirname, "html", "CloudFreed.html"), proxy);
            return response;
          },

          /**
           * Solves Cloudflare's "Turnstile" challenge.
           * Do NOT use the same instance for more than one challenge at once.
           * @param {string} url - The URL to solve the challenge for.
           * @param {string} sitekey - The sitekey of the website to solve the challenge for.
           * @returns {Promise<{success: boolean, code: number, response?: string}>}
           */
          SolveTurnstile: async (url, sitekey) => {
            console.log('Solving ' + url);
            const response = await SolveTurnstile(websocket, url, sitekey, `file:///${path.join(__dirname, "html", "CloudFreed.html")}`, proxy);
            return response;
          },

          /**
           * Closes CloudFreed Instance.
           */
          Close : async () => {
            try {
              if (websocket) {
                websocket.close();
              }

              if (PID) {
                KillProcess(PID);
              }

              return {
                success: true,
                code: 200
              };
            } catch {
              return {
                success: false,
                code: 500,
                errormessage: "Error occurred while closing."
              };
            }
          }
        };
      }
    } catch (error) {
      if (chromeProcess) {
        KillProcess(chromeProcess.pid);
        chromeProcess.kill();
      }

      return {
        success: false,
        code: 500,
        error,
        errormessage: `Error occurred on our side: ${error.message}`
      };
    }
  }
}

export default CloudFreed;