import ValidateURL from "./lib/ValidateURL.js";
import GetDefaultChromePath from "./lib/GetDefaultChromePath.js"
import GetHomeDirectory from "./lib/GetHomeDirectory.js"
import delay from "./lib/delay.js"
import DeleteTempUserDataFolders from "./lib/DeleteTempUserDataFolders.js"
import FindAvailablePort from "./lib/FindAvailablePort.js"
import CheckDebuggingEndpoint from "./lib/CheckDebuggingEndpoint.js"
import WebSocketManager from "./lib/WebSocketManager.js"
import KillProcess from "./lib/KillProcess.js"
import WebSocket from "ws"
import fs from "fs/promises"
import { homedir } from 'os';
import { spawn } from "child_process"
import path from 'path';
import { fileURLToPath } from 'url';

var __dirname = path.dirname(fileURLToPath(import.meta.url))

class CloudFreed {
  constructor() {
    this.chromium = GetDefaultChromePath()
    this.homedir = GetHomeDirectory()
    this.started = false
    this.closed = false
    this.PID = null
    this.websocket = null
    this.UserAgent = null
  }
  async start(headless, userAgent) {
    let chromeProcess;

    try {
      if (this.started === true) {
        return {
          success: false,
          code: 400,
          errormessage: "CloudFreed is already running."
        }
      }
      //Check if OS is valid
      if (this.chromium === null && this.homedir === null) {
        return {
          success: false, 
          code: 500,
          errormessage: "Unsupported OS, please use darwin, linux, or windows."
        }        
      }

      // Check if Chrome is installed/misplaced
      try {
        await fs.access(this.chromium);
      } catch (error) {
        return {
          success: false,
          code: 500,
          errormessage: "Google Chrome is not installed on host server, please install Google Chrome and try again.\nAttempted path: " + this.chromium
        }
      }

      const cloudflareBypassDir = path.join(this.homedir, 'CloudFreed');
    
      // Delete temporary user data folders
      await DeleteTempUserDataFolders(path.join(cloudflareBypassDir, 'DataDirs'));

      // Find an available port
      const port = await FindAvailablePort(10000, 60000);
      const dataDir = path.join(cloudflareBypassDir, 'DataDirs', `CloudFreed_${Date.now()}`);
      
      // Configure Chrome arguments
      const chromeArgs = [
        `--user-data-dir=${dataDir}`,
        '--window-size=1024,1024',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        `--remote-debugging-port=${port}`,
        `--window-name=CloudFreed`,
        '--allow-file-access-from-files',
        `file:///${path.join(__dirname, "html", "CloudFreed.html")}`,
      ];

      if (typeof userAgent === "string") {
        chromeArgs.push(`--user-agent="${userAgent}"`)
      }

      // Launch Chrome in headless mode
      chromeProcess = spawn(this.chromium, chromeArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: headless
      }); // Use unref to allow the parent process to exit independently of the child process.

      this.PID = chromeProcess.pid
      this.started = true

      chromeProcess.unref()

      // Fetch Chrome version information
      const versionInfo = await CheckDebuggingEndpoint(port);

      if (versionInfo === null) {
        return {
          success: false,
          code: 500,
          errormessage: "Error occurred on our side: VersionInfo could not be parsed from chrome. returned null."
        }
      }

      // If WebSocket debugger URL is available, establish WebSocket connection
      if (versionInfo['webSocketDebuggerUrl']) {
        const webSocketDebuggerUrl = versionInfo['webSocketDebuggerUrl'];
        
        this.UserAgent = versionInfo['User-Agent']
        this.websocket = new WebSocket(webSocketDebuggerUrl);

        return {
          success: true,
          code: 200,
          userAgent: this.UserAgent,
          webSocketDebuggerUrl,
          SolveTurnstile: async (url) => {
            return await this.SolveTurnstile(url);
          },
          Close: async () => {
            return await this.Close();
          }
        }
      }
    } catch(error) {
      if (chromeProcess) KillProcess(chromeProcess.pid), chromeProcess.kill();
    
      return {
        success: false,
        code: 500,
        error,
        errormessage: "Error occurred on our side: " + error.message
      }
    }
  }

  async SolveTurnstile(url) {
    url = ValidateURL(url)
    console.log('Solving ' + url)
    const response = await WebSocketManager(this.websocket, url, `file:///${path.join(__dirname, "html", "Loading.html")}`)
    await delay(1000)
    return response
  }

  async Close() {
    try {
      if (this.closed === false) {
        // Close the WebSocket connection if it exists
        if (this.websocket) {
          this.websocket.close();
          this.websocket = null
        }
    
        // Kill the process if the PID is not null
        if (this.PID) {
          await KillProcess(this.PID);
          this.PID = null
        }

        this.closed = true
    
        return { 
          success: true, 
          code: 200 
        };
      } else {
        return {
          success: false, 
          code: 400, 
          errormessage: "CloudFreed already closed."
        }
      }
    } catch {
      return {
        success: false, 
        code: 500,
        errormessage: "Error occured while closing."
      }
    }
  }
}

export default CloudFreed