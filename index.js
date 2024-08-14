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
  constructor() {
    this.chromium = GetDefaultChromePath();
    this.homedir = GetHomeDirectory();
    this.started = false;
    this.closed = false;
    this.PID = null;
    this.websocket = null;
    this.UserAgent = null;
    this.proxy = null;
  }

  /**
   * Starts a CloudFreed Instance
   * @param {boolean|undefined} headless - Whether the instance should run in headless mode.
   * @param {string|undefined} userAgent - The user agent string to use.
   * @param {Promise<{host: string, port: number, username: string|undefined, password: string|undefined}>|undefined} proxy - An optional proxy configuration.
   * @returns {Promise<Instance>} - Returns a promise that resolves to an instance.
   */

  async start(headless, userAgent, proxy) {
    let chromeProcess;

    try {
      if (this.started) {
        return {
          success: false,
          code: 400,
          errormessage: "CloudFreed is already running."
        };
      }

      // Check if OS is valid
      if (!this.chromium && !this.homedir) {
        return {
          success: false,
          code: 500,
          errormessage: "Unsupported OS, please use darwin, linux, or windows."
        };
      }

      // Check if Chrome is installed or uninstalled/misplaced
      try {
        await fs.access(this.chromium);
      } catch (error) {
        return {
          success: false,
          code: 500,
          errormessage: `Google Chrome is not installed on host server, please install Google Chrome and try again.\nAttempted path: ${this.chromium}`
        };
      }

      const cloudflareBypassDir = path.join(this.homedir, 'CloudFreed');

      // Delete temporary user data folders
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
        '--disable-gpu',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--no-sandbox',
        '--lang=en',
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
      chromeProcess = spawn(this.chromium, chromeArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: headless
      });

      this.PID = chromeProcess.pid;
      this.started = true;
      chromeProcess.unref();

      // Fetch Chrome version information
      const versionInfo = await CheckDebuggingEndpoint(port);

      if (!versionInfo) {
        return {
          success: false,
          code: 500,
          errormessage: "Error occurred on our side: VersionInfo could not be parsed from chrome. returned null."
        };
      }

      // If WebSocket debugger URL is available, establish WebSocket connection
      if (versionInfo.webSocketDebuggerUrl) {
        this.UserAgent = versionInfo['User-Agent'];
        this.websocket = await CDP({ port });
        this.proxy = proxy;

        return {
          success: true,
          code: 200,
          userAgent: this.UserAgent,
          webSocketDebuggerUrl: versionInfo.webSocketDebuggerUrl,
          port,

          /**
           * Solves Cloudflare's "I'm Under Attack Mode" challenge.
           * Do NOT use the same instance for more than one challenge at once.
           * @param {string} url - The URL to solve the challenge for.
           * @returns {Promise<{success: boolean, code: number, cfClearance?: Object, cfClearanceHeader?: string}>}
           */
          SolveIUAM: async (url) => await this.SolveIUAM(url),

          /**
           * Solves Cloudflare's "Turnstile" challenge.
           * Do NOT use the same instance for more than one challenge at once.
           * @param {string} url - The URL to solve the challenge for.
           * @param {string} sitekey - The sitekey of the website to solve the challenge for.
           * @returns {Promise<{success: boolean, code: number, response?: string}>}
           */
          SolveTurnstile: async (url, sitekey) => await this.SolveTurnstile(url, sitekey),

          /**
           * Closes CloudFreed
           */
          Close: async () => await this.Close()
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

  async SolveIUAM(url) {
    url = ValidateURL(url);
    console.log('Solving ' + url);
    const response = await SolveIUAM(this.websocket, url, path.join(__dirname, "html", "CloudFreed.html"), this.proxy);
    return response;
  }

  async SolveTurnstile(url, sitekey) {
    console.log('Solving ' + url);
    const response = await SolveTurnstile(this.websocket, url, sitekey, `file:///${path.join(__dirname, "html", "CloudFreed.html")}`, this.proxy);
    return response;
  }

  async Close() {
    try {
      if (!this.closed) {
        // Close the WebSocket connection if it exists
        if (this.websocket) {
          this.websocket.close();
          this.websocket = null;
        }

        // Kill the process if the PID is not null
        if (this.PID) {
          await KillProcess(this.PID);
          this.PID = null;
        }

        this.closed = true;

        return {
          success: true,
          code: 200
        };
      } else {
        return {
          success: false,
          code: 400,
          errormessage: "CloudFreed already closed."
        };
      }
    } catch {
      return {
        success: false,
        code: 500,
        errormessage: "Error occurred while closing."
      };
    }
  }
}

export default CloudFreed;
