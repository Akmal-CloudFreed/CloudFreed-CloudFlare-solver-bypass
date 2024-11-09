import ValidateURL from "./lib/ValidateURL.js";
import GetDefaultChromePath from "./lib/GetDefaultChromePath.js";
import GetHomeDirectory from "./lib/GetHomeDirectory.js";
import delay from "./lib/delay.js";
import DeleteTempUserDataFolders from "./lib/DeleteTempUserDataFolders.js";
import FindAvailablePort from "./lib/FindAvailablePort.js";
import CheckDebuggingEndpoint from "./lib/CheckDebuggingEndpoint.js";
import KillProcess from "./lib/KillProcess.js";
import Solve from "./lib/Solve.js";

// Separate library imports from module imports
import CDP from "chrome-remote-interface";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, "lib", "Extension");
const chromium = GetDefaultChromePath();
const homedir = GetHomeDirectory();

class CloudFreed {
  /**
   * Starts a CloudFreed Instance
   * @param {boolean|undefined} headless - Whether the instance should run in headless mode.
   * @param {boolean|undefined} proxyOverride
   */
  async start(headless, proxyOverride) {
    let chromeProcess;

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
      const random8DigitNumber = Math.floor(10000000 + Math.random() * 90000000);
      const dataDir = path.join(cloudflareBypassDir, 'DataDirs', `CloudFreed_${Date.now()+random8DigitNumber}`);

      // Configure Chrome arguments
      const chromeArgs = [
        `--user-data-dir=${dataDir}`,
        '--window-size=512,512',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--disable-background-networking',
        '--disable-web-security',
        '--disk-cache-size=1',
        '--disable-default-apps',
        '--disable-translate',
        '--disk-cache-size=0',
        '--disable-application-cache',
        '--disable-gpu',
        '--disable-features=CookiesWithoutSameSiteMustBeSecure',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--lang=en',
        '--disable-sync',
        `--remote-debugging-port=${port}`,
        '--window-name=CloudFreed',
        '--allow-file-access-from-files',
        '--ignore-certificate-errors',
        '--disable-infobars',
        //'--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"', // default user agent if the user inputs no UA, it get outputted in the response.
        `--app=file:///${path.join(__dirname, "html", "CloudFreed.html")}`,
      ];

      if (headless === true) {
        chromeArgs.push('--headless=new')
      }

      // Launch Chrome in headless mode
      chromeProcess = spawn(chromium, chromeArgs, {
        detached: true,
        stdio: 'ignore'
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
      if (versionInfo.webSocketDebuggerUrl && versionInfo["User-Agent"]) {
        let solving = false
        const originalUserAgent = versionInfo["User-Agent"].includes("Headless") ? versionInfo["User-Agent"].replace("Headless", "") : versionInfo["User-Agent"]
        console.log("Process started with " + originalUserAgent + " user agent")
        const client = await CDP({ port });
        let target = null, extensionTarget = null, targetId, sessionId = null, extensionSessionId = null;
    
        for (let i = 0; i < 10; i++) {  // Try up to 10 times
            const targets = (await client.Target.getTargets()).targetInfos;
            target = targets.find(t => t.type === "page" && t.title === "CloudFreed");
            extensionTarget = targets.find((t) => t.type === "service_worker" && !t.url.includes("neajdpp"));
    
            if (target && extensionTarget) {
              break;  // Exit the loop if the target is found
            }
    
            await delay(500)  // Wait for 500ms before retrying
        }
    
        if (target && extensionTarget && target.targetId && extensionTarget.targetId) {
          targetId = target.targetId;
          const extensionTargetId = extensionTarget.targetId
          extensionSessionId = (await client.Target.attachToTarget({ targetId: extensionTargetId, flatten: true })).sessionId;
          sessionId = (await client.Target.attachToTarget({ targetId, flatten: true })).sessionId;
        } else {
          return {
            success: false,
            code: 500,
            errormessage: "Error occurred while initializing."
          };
        }

        await client.Network.enable();
        await client.DOM.enable(sessionId)
        await client.Log.enable(sessionId)
        await client.Network.setCacheDisabled({ cacheDisabled: true })
        await client.Emulation.setFocusEmulationEnabled({ enabled: true }, sessionId)

        let solve = new Solve(client, sessionId, originalUserAgent, extensionSessionId, proxyOverride)

        return {
          success: true,
          code: 200,
          userAgent: originalUserAgent,
          webSocketDebuggerUrl: versionInfo.webSocketDebuggerUrl,
          port,

          /**
           * Solves CloudFlare Challenge.
           * @param {CDP.Client} client
           * @param {{url: string, type: string, sitekey: string|undefined, userAgent: string|undefined, action:string|undefined, proxy: {scheme: string, host: string, port: Number, username: string|undefined, password: string|undefined}}} data
           * @param {string} sessionId
           */
          Solve: async (data) => {
            try {
              if (solving === false) {
                if (typeof data === "object") {
                  if (data.url && typeof data.url === "string") {
                    if (data.type && typeof data.type === "string") {
                      solving = true
                      data.url = ValidateURL(data.url);
                      console.log('Solving ' + data.url);

                      const solveWithTimeout = new Promise(async (resolve, reject) => {
                        try {
                          const response = await solve.Solve(data);

                          await client.Page.navigate({ url: `file:///${path.join(__dirname, "html", "CloudFreed.html")}` }, sessionId);
                          
                          solving = false

                          resolve(response);
                        } catch (error) {
                          solving = false
                          
                          resolve({
                            success: false,
                            code: 500,
                            errormessage: "Error occurred while initializing.",
                            error
                          });
                        }
                      });

                      const timeout = new Promise((resolve) => {
                        let elapsed = 0;
                      
                        const interval = setInterval(async () => {
                          elapsed += 1;
                      
                          // Check if the solving flag is false or if we've reached 60 seconds (60 iterations)
                          if (solving === false || elapsed >= 60) {
                            clearInterval(interval); // Stop the interval after 60 seconds or if solving is false
                      
                            if (solving === true) {
                              try {
                                // Navigate the page if solving is still true after 60 seconds
                                await client.Page.navigate({ url: `file:///${path.join(__dirname, "html", "CloudFreed.html")}` }, sessionId);
                      
                                solving = false;
                      
                                resolve({ success: false, code: 408, errormessage: "Request timed out after 60 seconds." });
                              } catch (error) {
                                resolve({ success: false, code: 408, errormessage: "Request timed out with an error after 60 seconds." });
                              }
                            } else {
                              return; // Resolve immediately if solving became false before 60 seconds
                            }
                          }
                        }, 1000); // Run every 1 second
                      });                      

                      // Use Promise.race to return whichever promise resolves first (response or timeout)
                      const result = await Promise.race([solveWithTimeout, timeout]);

                      solving = false

                      return result;
                    } else {
                      return {
                        success: false,
                        code: 400,
                        errormessage: `Invalid input: Expected data.type to be of type "string", but received "${typeof data.url}".`
                      };
                    }
                  } else {
                    return {
                      success: false,
                      code: 400,
                      errormessage: `Invalid input: Expected data.url to be of type "string", but received "${typeof data.url}".`
                    };
                  }
                } else {
                  return {
                    success: false,
                    code: 400,
                    errormessage: `Invalid input: Expected data to be of type "Object", but received "${typeof data}".`
                  };
                }
              } else {
                return {
                  success: false,
                  code: 503,
                  errormessage: "Instance currently busy."
                };
              }
            } catch (error) {
              return {
                success: false,
                code: 500,
                errormessage: "Error occurred while initializing.",
                error
              };
            }
          },

          /**
           * Closes CloudFreed Instance.
           */
          Close: async () => {
            try {
              if (client) {
                client.close();
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
