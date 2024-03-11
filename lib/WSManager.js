import fetch from "node-fetch";

const findScript = `(function() {const element = document.body.innerHTML;return element;})();`;

/**
 * Introduce a delay.
 * @param {number} milliseconds - The duration of the delay in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

// Format single browser cookie object to tough-cookie object
function formatCookies(cookies) {
  const currentDate = new Date().toISOString();
  return cookies.map((cookie) => ({
      key: cookie.name,
      value: cookie.value,
      expires: cookie.expires,
      domain: cookie.domain.replace(/^\./, ""),
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      hostOnly: !cookie.domain.startsWith("."),
      creation: currentDate,
      lastAccessed: currentDate
  }));
};


/**
 * Manages WebSocket communication to retrieve cookies from a webpage.
 * @param {WebSocket} ws - The WebSocket object for communication.
 * @param {string} url - The URL of the webpage to retrieve cookies from.
 * @returns {Promise<{json: Object[], header: string, cf_clearence: string} | boolean>} - A promise that resolves to an object containing the cookies in JSON format, the Cookie header string,
 * or false if no cookies are found.
 */
async function WSManager(ws, url, agent) {
  return new Promise((resolve, reject) => {
    try {
      // Open WebSocket connection
      ws.addEventListener('open', function open() {
        // Send request to get targets
        ws.send(JSON.stringify({ id: 1, method: 'Target.getTargets', params: {} }));
      });

      // Message event handler
      ws.addEventListener('message', async function incoming(event) {
        try {
          const messageString = event.data.toString('utf8');
          const response = JSON.parse(messageString);

          // Check if the message is a request interception
          if (response.method === 'Network.requestIntercepted') {
            const request = response.params.request;

            // Extract request details
            const interceptedUrl = request.url;
            const method = request.method;
            const headers = request.headers;
            const body = request.postData;
            const requestData = { method: method, headers: headers, body: body, agent };

            try {
              // Fetch the intercepted request
              const data = await fetch(interceptedUrl, requestData);

              // Extract response details
              const responseBody = await data.text();
              const responseHeaders = data.headers.raw();

              // Send the intercepted request and response back to the browser
              ws.send(JSON.stringify({
                sessionId: response.sessionId,
                id: 2,
                method: 'Network.continueInterceptedRequest',
                params: {
                  interceptionId: response.params.interceptionId,
                  rawResponse: body && responseBody ? btoa(responseBody) : undefined, // Base64 encode response body
                  responseHeaders: responseHeaders
                }
              }));
            } catch (error) {
              if (ws.readyState === 1) {
                ws.close();
              }
              // If there's an error, continue the intercepted request as usual
              ws.send(JSON.stringify({
                sessionId: response.sessionId,
                id: 2,
                method: 'Network.continueInterceptedRequest',
                params: {
                  interceptionId: response.params.interceptionId
                }
              }));
            }
          } else if (response.id === 1 && response.result && response.result.targetInfos) {
            const targets = response.result.targetInfos;
            for (const target of targets) {
              if (target.type === 'page' && target.title === "CloudFreed") {
                const targetId = target.targetId;

                ws.send(JSON.stringify({ id: 3, method: 'Target.attachToTarget', params: { targetId, flatten: true } }));

                break;
              }
            }
          } else if (response.id === 3 && response.result && response.result.sessionId) {
            const sessionId = response.result.sessionId;

            ws.send(JSON.stringify({ sessionId, id: 4, method: 'Network.enable', params: {} }));

            ws.send(JSON.stringify({ sessionId, id: 5, method: 'Network.setRequestInterception', params: { patterns: [{ urlPattern: '*', interceptionStage: 'Request' }]} }));

            ws.send(JSON.stringify({ sessionId, id: 6, method: 'Page.navigate', params: { url: new URL(url).href } }));

            ws.send(JSON.stringify({ sessionId, id: 7, method: 'Runtime.evaluate', params: { expression: findScript }}));
          } else if (response.id === 7) {
            if (response.result && response.result.result && response.result.result.value === 'true') {
              ws.send(JSON.stringify({ sessionId: response.sessionId, id: 8, method: 'Network.getAllCookies' }));
            } else if (response.result && response.result.result && response.result.result.value === 'false') {
              console.log('Problem...');
              ws.send(JSON.stringify({ id: 9, method: 'Browser.close'}));
              if (ws.readyState === 1) {
                ws.close();
              }
              resolve({
                success: false,
                code: 500,
                error: new Error('Evaluation result was false'),
                errormessage: "Problem occurred. Evaluation result was false, your proxy might be blacklisted."
              });
            } else {
              // Request another evaluation
              await delay(1000);
              ws.send(JSON.stringify({ sessionId: response.sessionId, id: 7, method: 'Runtime.evaluate', params: { expression: findScript }}));
            }
          } else if (response.id === 8 && response.result && response.result.cookies) {
            const cookies = response.result.cookies;
            const formattedCookies = formatCookies(cookies);
            const cookieHeader = formattedCookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
            // Find the cookie with key 'cf_clearance'
            const cf_clearanceCookie = cookies.find(cookie => cookie.name === 'cf_clearance');

            // Extract the value of cf_clearance, if found
            const cf_clearence = cf_clearanceCookie ? `${cf_clearanceCookie.name}=${cf_clearanceCookie.value}` : undefined;

            console.log("Got cookies successfully!");

            if (ws.readyState === 1) {
              ws.close();
            }

            resolve({ json: formattedCookies, header: cookieHeader, cf_clearence });
          }
        } catch (error) {
          if (ws.readyState === 1) {
            ws.close();
          }

          resolve({
            success: false,
            code: 500,
            error,
            errormessage: "An error occurred on our side. Please check your request or try again later."
          });
        }
      });

      ws.addEventListener('close', function close() {
        // Handle close event if needed
      });
    } catch (error) {
      if (ws.readyState === 1) {
        ws.close();
      }

      resolve({
        success: false,
        code: 500,
        error,
        errormessage: "An error occurred on our side. Please check your request or try again later."
      });
    }
  });
}

export default WSManager;
