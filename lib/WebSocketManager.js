import delay from "./delay.js";
import ConvertToCDPHeaders from "./ConvertToCDPHeaders.js";
import CloudFlareClick from "./CloudFlareClick.js";
import StatusText from "./StatusText.js"

const StatisText = StatusText()

async function WebSocketManager(websocket, url, html) {
  let isResolved = false;

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

            //console.log("Network.getAllCookies response received:", response.result.cookies); // Log the received cookies

            const cookies = response.result.cookies;
            const cfClearance = cookies.find(cookie => cookie.name === "cf_clearance");

            if (cfClearance) {
              const cfClearanceHeader = `${cfClearance.name}=${cfClearance.value};`

              websocket.send(JSON.stringify({
                id: 9,
                method: 'Page.close',
                sessionId: response.sessionId
              }));

              isResolved = true;
              console.log("cf_clearance cookie found:", cfClearance); // Log the cookie
              resolve({ success: true, cfClearance, cfClearanceHeader });
            } else {
              console.log("cf_clearance cookie not found in the response.");
            }
          


















          // Split for readability.

          } else if (response.method === 'Network.requestIntercepted') {
            // If the intercepted request is a Document, it means that a page has loaded
            if (response.params.resourceType === "Document") {
              // Send the Network.getAllCookies request
              websocket.send(JSON.stringify({
                id: 6,
                method: 'Network.getAllCookies',
                sessionId: response.sessionId
              }));
            }

            if (isResolved) {
              return;
            }

            if (response.params.request.url.includes('cloudflare') && (response.params.resourceType === "Document" || response.params.resourceType === "Script")) {
              
              let id = parseInt(response.params.interceptionId.split('interception-job-')[1].split('.').join(''));

              interception[id] = {
                id: response.params.interceptionId,
                statusCode: response.params.responseStatusCode,
                statusText: StatisText[String(response.params.responseStatusCode)] || "Unknown Server Response (CloudFreed)",
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
                params: { 
                  interceptionId: response.params.interceptionId
                },
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

            if (body.includes(`src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1`)) {
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
              
              let rayID = body.split('<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1?ray=')[1].split('&')[0]
              console.log(rayID)

              let oldScript = `<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1?ray=${rayID}&lang=auto"></script>`
              
              let newScript = 
`
    <script>
      async function CloudFreedOnTop() {
        try {
          // Fetch the script content
          const response = await fetch("https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/orchestrate/chl_api/v1?ray=${rayID}&lang=auto", {
            credentials: 'include'
          });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          let scriptContent = await response.text();
                        
          // Replace the word "closed" with "open"
          scriptContent = scriptContent.replace(/closed/g, 'open');
                        
          // Create a new script element
          const scriptElement = document.createElement('script');
          scriptElement.textContent = scriptContent;
                        
          // Append the script to the head or body to execute it
          document.head.appendChild(scriptElement);

          ${clicker}
        } catch (error) {
          console.error('Failed to fetch and modify the script:', error);
        }
      }
      CloudFreedOnTop()
    </script>
`
               body = body.replace(oldScript, newScript)
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