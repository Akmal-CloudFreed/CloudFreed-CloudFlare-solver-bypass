import ConvertToCDPHeaders from "./ConvertToCDPHeaders.js"
import CloudFlareClick from "./CloudFlareClick.js"
import delay from "./delay.js";
import WebSocket from "ws"
import fetch from "node-fetch"

class ChromeIntercept {
  constructor() {
    this.Clicker = CloudFlareClick()
    this.challenges = 0
    this.Targets = false
  }

  async ChromeIntercept(response, websocket, url, agent) {
    try {
      if (response.method === 'Network.requestIntercepted') {
        const request = response.params.request;

        const interceptedUrl = request.url;
        const method = request.method;
        const headers = request.headers;
        const body = request.postData;
        const requestData = { method, headers, body, agent };

        try {
          // Fetch the intercepted request
          const data = await fetch(interceptedUrl, requestData);

          let responseBody = await data.text();

          // Get response headers
          const responseHeaders = ConvertToCDPHeaders(data.headers.raw())

          if (response.params.resourceType === "Document") {
            if (interceptedUrl.includes("challenges.cloudflare.com/cdn-cgi/challenge-platform") && responseBody.includes(`id="challenge-stage"`)) {
              this.challenges += 1

              if (this.challenges >= 5) {
                websocket.send(JSON.stringify({ sessionId: response.sessionId, id: 10, method: 'Runtime.evaluate', params: { returnByValue: false, expression: `JSON.stringify(${JSON.stringify(
                  {
                    success: false,
                    type: "Error",
                    code: 500,
                    error: new Error('Too many attempts'),
                    errormessage: "Problem occurred. Too many cloudflare attempts, your proxy might be blacklisted."
                  }
                )})` } }));

                await delay(100);

                websocket.send(JSON.stringify({ id: 9, method: 'Browser.close' }));
                
                if (websocket.readyState === 1) {
                  websocket.close();
                }
              }

              responseBody = responseBody.replace("</body>", `<script>${this.Clicker}</script></body>`)
            }
          }

          const responseData = `HTTP/1.1 ${data.status} ${data.statusText}\r\n${responseHeaders.join('\r\n')}\r\n\r\n${responseBody}`

          // Send the intercepted request and response back to the browser
          websocket.send(JSON.stringify({
            sessionId: response.sessionId,
            id: 2,
            method: 'Network.continueInterceptedRequest',
            params: {
              interceptionId: response.params.interceptionId,
              rawResponse: Buffer.from(responseData).toString("base64") // Base64 encoded response body
            }
          }));

          if (response.params.resourceType === "Document" && responseHeaders.some(header => header.includes("cf_clearance"))) {
            await delay(5000)
            websocket.send(JSON.stringify({ sessionId: response.sessionId, id: 7, method: 'Network.getAllCookies' }));
          }
        } catch (error) {
          console.error(error)
          if (websocket.readyState === 1) {
            websocket.close();
          }
          // If there's an error, continue the intercepted request as usual
          websocket.send(JSON.stringify({
            sessionId: response.sessionId,
            id: 2,
            method: 'Network.continueInterceptedRequest',
            params: {
              interceptionId: response.params.interceptionId,
              rawResponse: Buffer.from("HTTP/1.1 500 Internal Server Error\r\n").toString("base64")
            }
          }));
        }
      }

      else if (this.Targets === false && response.id === 1 && response.result && response.result.targetInfos) {        
        const targets = response.result.targetInfos;

        for (const target of targets) {
          if (target.type === 'page' && target.title === "CloudFreed") {
            this.Targets = true
            const targetId = target.targetId;

            websocket.send(JSON.stringify({ id: 3, method: 'Target.attachToTarget', params: { targetId, flatten: true } }));
            break;
          }
        }
      }
      
      else if (response.id === 3 && response.result && response.result.sessionId) {
        const sessionId = response.result.sessionId;

        websocket.send(JSON.stringify({ sessionId, id: 10, method: 'Runtime.evaluate', params: { returnByValue: false, expression: `JSON.stringify(${JSON.stringify({ success: true, type: "Targets", Targets: true })})` } }));

        websocket.send(JSON.stringify({ sessionId, id: 4, method: 'Network.enable', params: {} }));
        websocket.send(JSON.stringify({ sessionId, id: 5, method: 'Network.setRequestInterception', params: { patterns: [{ urlPattern: '*', interceptionStage: 'Request' }] } }));

        websocket.send(JSON.stringify({ sessionId, id: 6, method: 'Page.navigate', params: { url: new URL(url).href } }));
      }
      else if (response.id === 7 && response.result && response.result.cookies) {
        const cookies = response.result.cookies

        // Check if any cookie has the name "cf_clearance"
        const cfClearance = cookies.find(cookie => cookie.name === "cf_clearance");

        if (cfClearance) {
          const cfClearenceHeader = `${cfClearance.name}=${cfClearance.value};`
          websocket.send(JSON.stringify({ sessionId: response.sessionId, id: 10, method: 'Runtime.evaluate', params: { returnByValue: false, expression: `JSON.stringify(${JSON.stringify({ success: true, type: "Cookies", cfClearance, cfClearenceHeader })})` } }));
        } else {
          console.log("cf_clearance cookie not found in the response.");
        }
      }
    } catch(err) {
      console.error(err)
    }
  }
}

export default ChromeIntercept