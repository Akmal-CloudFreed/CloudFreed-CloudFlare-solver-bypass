import delay from "./delay.js";
import { readFile, writeFile } from "./fs.js";
import path from "path";
import curl from "./curl.js"
import { fileURLToPath } from 'url';
import CDP from "chrome-remote-interface";

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load all required files asynchronously
const [IUAMHTML, invisibleHTML, TurnstileHTML, RecaptchaHTML] = await Promise.all([
  readFile(path.join(__dirname, "html", "IUAMChallenge.html")),
  readFile(path.join(__dirname, "html", "InvisibleChallenge.html")),
  readFile(path.join(__dirname, "html", "TurnstileChallenge.html")),
  readFile(path.join(__dirname, "html", "RecaptchaInvisibleChallenge.html"))
]);

const blockResourceTypes = ["Image", "Font", "Stylesheet", "Other", "Media"];
const invalidTypes = ["V3", "IUAM", "Turnstile", "Invisible", "RecaptchaInvisible"];

// Generate HTML templates with dynamic values
const generateInvisibleHTML = (r, t) => invisibleHTML.replace("![r]!", r).replace("![t]!", t);
const generateTurnstileHTML = (sitekey) => TurnstileHTML.replace("![sitekey]!", sitekey);
const generateRecaptchaHTML = (sitekey, action) => RecaptchaHTML.replace(/!\[sitekey\]!/g, sitekey).replace("![action]!", action);
const generateIUAMHTML = (script) => IUAMHTML.replace("![script]!", script);

class Solve {
  constructor(client, sessionId, originalUserAgent, extensionSessionId, proxyOverride) {
    this.client = client
    this.sessionId = sessionId
    this.originalUserAgent = originalUserAgent
    this.extensionSessionId = extensionSessionId
    this.proxyOverride = proxyOverride

    this.resolve = undefined
    this.Intercepted = ( listener ) => {}
    this.Extra = async ( response ) => {
      try {
        const setCookieHeader = response.headers['set-cookie']

        // Check and log Set-Cookie headers
        if (setCookieHeader && response.headers['content-length'] === '0' && setCookieHeader.includes("cf_clearance") && setCookieHeader.includes("\n")) {
          const cookie = setCookieHeader.split("\n")[1];

          this.resolve?.({ success: true, code: 200, response: cookie });
          return;
        }
      } catch (error) {
        console.error(error)
        // Resolve errors silently
      }
    }

    this.client.Network.requestIntercepted(listener => this.Intercepted?.(listener), this.sessionId);
    this.client.Network.responseReceivedExtraInfo(response => this.Extra?.(response), this.sessionId);
  }

    /**
   * @param {CDP.Client} this.client
   * @param {Object} data
   * @param {string} data.url - The URL to request.
   * @param {string} data.type - The request type (e.g., GET, POST).
   * @param {string|undefined} data.sitekey - The site key, if applicable.
   * @param {string|undefined} data.userAgent - The User-Agent string to use, if applicable.
   * @param {{ scheme:string, host:string, port:number, username:string|undefined, password:string|undefined }} data.proxy - The proxy configuration object, if applicable.
   * @param {string} sessionId
   * @param {string} originalUserAgent
   * @param {string} extensionSessionId
   * @param {boolean} proxyOverride
   */
  async Solve(data) {
    return new Promise(async (resolve, reject) => {
      try {        
        if (typeof this.client !== "object" || typeof data !== "object" || typeof this.sessionId !== "string" || !invalidTypes.includes(data.type) || !data.url || typeof data.url !== "string") {
          resolve({success: false, code: 500, errormessage: "Solve function received invalid parameters, please contact a dev."})
          return;
        }
  
        if (typeof data.userAgent !== "string") {
          data.userAgent = this.originalUserAgent
        }
  
        this.client.Network.setUserAgentOverride({ userAgent: data.userAgent })
        this.client.Emulation.setUserAgentOverride({ userAgent: data.userAgent })
  
        if (typeof data.proxy === "object" && typeof data.proxy.scheme === "string" && typeof data.proxy.host === "string" && typeof data.proxy.port === "number" && data.proxy.port > 0) {
          await this.client.Runtime.evaluate({
            expression: `consoleMessageHandler(${JSON.stringify({ type: "modifyData", data: { proxy: data.proxy, userAgent: data.userAgent }})});`
          }, this.extensionSessionId);
  
          await delay(100);
        } else if (data.proxy === undefined) {
          await this.client.Runtime.evaluate({
            expression: `consoleMessageHandler(${JSON.stringify({ type: "modifyData", data: { userAgent: data.userAgent }})});`
          }, this.extensionSessionId);
  
          await delay(100);
        } else {
          resolve({
            success: false,
            code: 500,
            errormessage: "Proxy entered is invalid, please check your parameters and try again."
          });
          return;
        }
  
        await this.client.Network.clearBrowserCookies(this.sessionId);
        this.resolve = resolve
  
        if (data.type === "V3" || data.type === "IUAM") {
          if (this.proxyOverride !== true && (!data.proxy || !data.proxy.scheme || !data.proxy.host || typeof data.proxy.port !== "number")) {
            resolve({
              success: false,
              code: 500,
              errormessage: "A Proxy is required for this type of solve, please enter a proxy into your request and try again."
            });
            return;
          }
  
          const proxyUrl = data.proxy && data.proxy.scheme && data.proxy.host && data.proxy.port
            ? `${data.proxy.scheme}://${data.proxy.username && data.proxy.password
                ? `${data.proxy.username}:${data.proxy.password}@`
                : ''}${data.proxy.host}:${data.proxy.port}`
            : undefined;
  
          // Construct headers if user agent is provided
          const headers = data.userAgent ? ['-H', `User-Agent: ${data.userAgent}`] : undefined;
  
          // Perform the HTTP request
          let html = await curl(data.url, "GET", proxyUrl, headers);
  
          if (!html.success) {
            resolve({
              success: false,
              code: html.code,
              cerror: html.err ? html.err : undefined,
              error: html.error ? html.error : undefined,
              errormessage: html.errormessage ? html.errormessage : "Unknown error occurred, please contact a dev."
            });
            return;
          }
  
          if (html.redirected) {
            resolve({
              success: false,
              code: 400,
              cerror: html.err ? html.err : undefined,
              errormessage: "Given URL leads to a redirect, please enter a URL that returns a cloudflare challenge."
            });
            return;
          }
  
          if (typeof html !== "object" || typeof html.response !== "string" || html.status !== 403 || !html.response.includes('<body class="no-js">')) {
            resolve({
              success: false,
              code: 400,
              cerror: html.err ? html.err : undefined,
              errormessage: "Failed to find IUAM challenge. Check the URL or proxy."
            });
            return;
          }
  
          this.Intercepted = async (listener) => {
            try {
              const continueRequest = async (options = {}) => {
                try {
                  await this.client.Network.continueInterceptedRequest({
                    interceptionId: listener.interceptionId,
                    ...options,
                  }, this.sessionId);
                } catch {}
              };
  
              const getBody = async () => {
                try {
                  const body = await this.client.Network.getResponseBodyForInterception({ interceptionId: listener.interceptionId }, this.sessionId);
                  return body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf-8") : body.body;
                } catch {}
              };
          
              if (listener.authChallenge) {
                if (!data.proxy.username || !data.proxy.password) {
                  resolve({
                    success: false,
                    code: 500,
                    errormessage: "Proxy Provided requires a Username & Password, request is missing one or more of these parameters."
                  });
                  return;
                }
          
                await continueRequest({
                  authChallengeResponse: {
                    response: "ProvideCredentials",
                    username: data.proxy.username,
                    password: data.proxy.password,
                  }
                });
                return;
              }
          
              if (blockResourceTypes.includes(listener.resourceType)) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 404 CloudFreed Stopped media\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n').toString('base64')
                });
                return;
              }
          
              if (listener.request.url === data.url && listener.responseHeaders) {
                if (listener.request.method === "GET") {
                  let body = await getBody()
                  if (body?.includes('<body class="no-js">')) {
                    const string = body.split('<body class="no-js">')[1].split('</body>')[0];
                    let html = generateIUAMHTML(string);
          
                    await continueRequest({
                      rawResponse: Buffer.from(`HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n${html}`).toString('base64')
                    });
                    return;
                  }
          
                  await continueRequest();
                  return;
                }
          
                if (listener.request.method === "POST") {
                  const t = Buffer.from(Math.floor(Date.now() / 1000).toString() + ".000000").toString("base64");
                  const r = listener.responseHeaders["cf-ray"].split('-')[0] ? listener.responseHeaders["cf-ray"].split('-')[0] : ""
                  await continueRequest({
                    rawResponse: Buffer.from(`HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n${generateInvisibleHTML(r, t)}`).toString('base64')
                  });
                  return;
                }
              }
  
              await continueRequest();
            } catch (error) {
              console.log(error)
              // Resolve errors silently
            }
          }
  
          await this.client.Network.setRequestInterception({
            patterns: [
              { urlPattern: "*" },
              { urlPattern: "*", interceptionStage: "HeadersReceived" }
            ]
          }, this.sessionId);
    
          await this.client.Page.navigate({ url: data.url }, this.sessionId)
        }
  
        if (data.type === "Turnstile") {
          this.Intercepted = async (listener) => {
            try {
              const continueRequest = async (options = {}) => {
                try {
                  await this.client.Network.continueInterceptedRequest({
                    interceptionId: listener.interceptionId,
                    ...options,
                  }, this.sessionId);
                } catch {}
              };
  
              if (listener.authChallenge) {
                if (!data.proxy.username || !data.proxy.password) {
                  resolve({
                    success: false,
                    code: 500,
                    errormessage: "Proxy Provided requires a Username & Password, request is missing one or more of these parameters."
                  });
                  return;
                }
          
                await continueRequest({
                  authChallengeResponse: {
                    response: "ProvideCredentials",
                    username: data.proxy.username,
                    password: data.proxy.password,
                  }
                });
                return;
              }
          
              if (blockResourceTypes.includes(listener.resourceType)) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 404 CloudFreed Stopped media\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n').toString('base64')
                });
                return;
              }
          
              if (listener.request.url === data.url) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n' + generateTurnstileHTML(data.sitekey)).toString('base64')
                });
                return;
              }
  
              if (listener.request.url === "https://internals.cloudfreed.com/turnstile") {
                await continueRequest()
  
                this.resolve?.({success: true, code: 200, response: listener.request.postData})
                return;
              }
  
              await continueRequest();
            } catch (error) {
              console.error(error)
              // Resolve errors silently
            }
          }
  
          await this.client.Network.setRequestInterception({
            patterns: [
              { urlPattern: "*" }
            ]
          }, this.sessionId);
    
          await this.client.Page.navigate({ url: data.url }, this.sessionId)
        }
  
        if (data.type === "Invisible") {
          if (this.proxyOverride !== true && (!data.proxy || !data.proxy.scheme || !data.proxy.host || typeof data.proxy.port !== "number")) {
            resolve({
              success: false,
              code: 500,
              errormessage: "A Proxy is required for this type of solve, please enter a proxy into your request and try again."
            });
            return;
          }
  
          this.Intercepted = async (listener) => {
            try {
              const continueRequest = async (options = {}) => {
                try {
                  await this.client.Network.continueInterceptedRequest({
                    interceptionId: listener.interceptionId,
                    ...options,
                  }, this.sessionId);
                } catch {}
              };
          
              if (listener.authChallenge) {
                if (!data.proxy.username || !data.proxy.password) {
                  resolve({
                    success: false,
                    code: 500,
                    errormessage: "Proxy Provided requires a Username & Password, request is missing one or more of these parameters."
                  });
                  return;
                }
          
                await continueRequest({
                  authChallengeResponse: {
                    response: "ProvideCredentials",
                    username: data.proxy.username,
                    password: data.proxy.password,
                  }
                });
                return;
              }
          
              if (blockResourceTypes.includes(listener.resourceType)) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 404 CloudFreed Stopped media\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n').toString('base64')
                });
                return;
              }
          
              if (listener.request.url === data.url && listener.responseHeaders) {
                const t = Buffer.from(Math.floor(Date.now() / 1000).toString() + ".000000").toString("base64");
                const r = listener.responseHeaders["cf-ray"].split('-')[0] ? listener.responseHeaders["cf-ray"].split('-')[0] : ""
                
                await continueRequest({
                  rawResponse: Buffer.from(`HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n${generateInvisibleHTML(r, t)}`).toString('base64')
                });
              }
  
              await continueRequest();
            } catch (error) {
              // Resolve errors silently
            }
          }
  
          await this.client.Network.setRequestInterception({
            patterns: [
              { urlPattern: "*" },
              { urlPattern: data.url, interceptionStage: "HeadersReceived" }
            ]
          }, this.sessionId);
    
          await this.client.Page.navigate({ url: data.url }, this.sessionId)
        }
  
        if (data.type === "RecaptchaInvisible") {
          if (typeof data.action !== "string") {
            resolve({
              success: false,
              code: 400,
              errormessage: "An action parameter is required for this type of solve, please enter an action into your request and try again."
            });
            return;
          }
  
          this.Intercepted = async (listener) => {
            try {
              const continueRequest = async (options = {}) => {
                try {
                  await this.client.Network.continueInterceptedRequest({
                    interceptionId: listener.interceptionId,
                    ...options,
                  }, this.sessionId);
                } catch {}
              };
  
              if (listener.authChallenge) {
                if (!data.proxy.username || !data.proxy.password) {
                  resolve({
                    success: false,
                    code: 500,
                    errormessage: "Proxy Provided requires a Username & Password, request is missing one or more of these parameters."
                  });
                  return;
                }
          
                await continueRequest({
                  authChallengeResponse: {
                    response: "ProvideCredentials",
                    username: data.proxy.username,
                    password: data.proxy.password,
                  }
                });
                return;
              }
          
              if (blockResourceTypes.includes(listener.resourceType)) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 404 CloudFreed Stopped media\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n').toString('base64')
                });
                return;
              }
          
              if (listener.request.url === data.url) {
                await continueRequest({
                  rawResponse: Buffer.from('HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n' + generateRecaptchaHTML(data.sitekey, data.action)).toString('base64')
                });
                return;
              }
  
              if (listener.request.url === "https://internals.cloudfreed.com/turnstile") {
                await continueRequest()
                
                this.resolve?.({success: true, code: 200, response: listener.request.postData})
                return;
              }
  
              await continueRequest();
            } catch (error) {
              console.error(error)
              // Resolve errors silently
            }
          }
  
          await this.client.Network.setRequestInterception({
            patterns: [
              { urlPattern: "*" }
            ]
          }, this.sessionId);
    
          await this.client.Page.navigate({ url: data.url }, this.sessionId)
        }
      } catch (error) {
        try {
          await this.client.Network.setRequestInterception({ patterns: [] }, this.sessionId);
  
          resolve({
            success: false,
            code: 500,
            errormessage: "An error occurred on our side. Please check your request or try again later.",
            error
          });
          return;
        } catch (error) {
          resolve({
            success: false,
            code: 500,
            errormessage: "An error occurred on our side. Please check your request or try again later.",
            error
          });
          return;
        }
      }
    })
  }
}

export default Solve