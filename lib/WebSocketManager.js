import delay from "./delay.js";
import ConvertToCDPHeaders from "./ConvertToCDPHeaders.js";
import CloudFlareClick from "./CloudFlareClick.js";

const StatusText = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "103": "Early Hints",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Too Early",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "510": "Not Extended",
  "511": "Network Authentication Required"
};

async function WebSocketManager(websocket, url, html) {
  return new Promise(async (resolve, reject) => {
    try {
      let opened = false;
      let challenges = 0;
      let interception = {};
      const clicker = CloudFlareClick();

      function open() {
        delay(1000).then(() => {
          if (opened) return;

          if (++challenges >= 10) {
            resolve({
              success: false,
              code: 500,
              errormessage: "An error occurred on our side. Error getting Target infos."
            });
            return;
          }

          websocket.send(JSON.stringify({
            id: 1,
            method: 'Target.createTarget',
            params: { url: html }
          }));

          open();
        });
      }

      open();

      websocket.addEventListener('message', async function incoming(event) {
        try {
          const messageString = event.data.toString('utf8');
          const response = JSON.parse(messageString);

          if (response.id === 1 && response.result && response.result.targetId) {
            const targetId = response.result.targetId;
            opened = true;

            websocket.send(JSON.stringify({
              id: 2,
              method: 'Target.attachToTarget',
              params: { targetId, flatten: true }
            }));
          } else if (response.id === 2 && response.result && response.result.sessionId) {
            const sessionId = response.result.sessionId;

            websocket.send(JSON.stringify({
              id: 3,
              method: 'Network.setRequestInterception',
              params: { patterns: [{ urlPattern: '*', interceptionStage: 'HeadersReceived' }] },
              sessionId
            }));

            websocket.send(JSON.stringify({
              id: 4,
              method: 'Page.navigate',
              params: { url },
              sessionId
            }));
          } else if (response.id === 6 && response.result && response.result.cookies) {
            const cookies = response.result.cookies;
            const cfClearance = cookies.find(cookie => cookie.name === "cf_clearance");

            if (cfClearance) {
              const cfClearanceHeader = `${cfClearance.name}=${cfClearance.value};`

              websocket.send(JSON.stringify({
                id: 9,
                method: 'Page.close',
                sessionId: response.sessionId
              }));

              resolve({ success: true, cfClearance, cfClearanceHeader });
            } else {
              console.log("cf_clearance cookie not found in the response.");
            }
          } else if (response.method === 'Network.requestIntercepted') {
            if (response.params.resourceType === "Document" && response.params.request.url.includes("challenges.cloudflare.com/cdn-cgi/challenge-platform")) {
              let id = parseInt(response.params.interceptionId.split('interception-job-')[1].split('.').join(''));

              interception[id] = {
                id: response.params.interceptionId,
                statusCode: response.params.responseStatusCode,
                statusText: StatusText[String(response.params.responseStatusCode)] || "Unknown Server Response (CloudFreed)",
                headers: ConvertToCDPHeaders(response.params.responseHeaders)
              };

              websocket.send(JSON.stringify({
                id,
                method: 'Network.getResponseBodyForInterception',
                params: { interceptionId: response.params.interceptionId },
                sessionId: response.sessionId
              }));
            } else {
              websocket.send(JSON.stringify({
                sessionId: response.sessionId,
                id: 5,
                method: 'Network.continueInterceptedRequest',
                params: { interceptionId: response.params.interceptionId }
              }));

              if (JSON.stringify(ConvertToCDPHeaders(response.params.request.headers)).includes("cf_clearance")) {
                websocket.send(JSON.stringify({
                  id: 3,
                  method: 'Network.setRequestInterception',
                  params: { patterns: [] },
                  sessionId: response.sessionId
                }));

                await delay(5000)
                
                websocket.send(JSON.stringify({
                  sessionId: response.sessionId,
                  id: 6,
                  method: 'Network.getAllCookies'
                }));
              }
            }
          } else if (response.id >= 10 && response.result && response.result.body) {            
            const id = response.id;
            let body = response.result.base64Encoded ? Buffer.from(response.result.body, 'base64').toString('utf-8') : response.result.body;

            if (body.includes(`id="challenge-stage"`)) {
              if (++challenges >= 5) {
                await delay(100);
                websocket.send(JSON.stringify({ id: 9, method: 'Page.close', sessionId: response.sessionId }));

                resolve({
                  success: false,
                  type: "Error",
                  code: 500,
                  error: new Error('Too many attempts'),
                  errormessage: "Problem occurred. Too many cloudflare attempts, your proxy might be blacklisted."
                });
              }
  
              body = body.replace("</body>", `<script>${clicker}</script></body>`);
            }

            const responseData = `HTTP/1.2 ${interception[id].statusCode} ${interception[id].statusText}\r\n${interception[id].headers.join('\r\n') || ''}\r\n\r\n${body}`;

            websocket.send(JSON.stringify({
              sessionId: response.sessionId,
              id: 5,
              method: 'Network.continueInterceptedRequest',
              params: {
                interceptionId: interception[id].id,
                rawResponse: response.result.base64Encoded === true ? Buffer.from(responseData).toString("base64") : responseData // Base64 encoded response body
              }
            }));
          }
        } catch (error) {
          if (websocket.readyState === 1) websocket.close();

          resolve({
            success: false,
            code: 500,
            error,
            errormessage: "An error occurred on our side. Please check your request or try again later."
          });
        }
      });

      websocket.addEventListener('close', function close() {
        // Handle close event if needed
      });
    } catch (error) {
      if (websocket.readyState === 1) websocket.close();

      resolve({
        success: false,
        code: 500,
        error,
        errormessage: "An error occurred on our side. Please check your request or try again later."
      });
    }
  });
}

export default WebSocketManager;