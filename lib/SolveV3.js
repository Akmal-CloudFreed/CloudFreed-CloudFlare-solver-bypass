import delay from "./delay.js";
import CDP from "chrome-remote-interface";

const blockResourceTypes = ["Image", "Font", "Stylesheet", "Other", "Media"];
const scriptRegex = /window\.__CF\$cv\$params\s*=\s*\{r:'(.+?)',t:'(.+?)'\};/;

/**
 * @param {CDP.Client} client
 */
const waitForLoading = (client, requestId, sessionId) => {
  return new Promise((resolve) => {
    client.Network.loadingFinished(({ requestId: finishedRequestId }) => {
      if (finishedRequestId === requestId) {
        resolve();
      }
    }, sessionId);
  });
};

function generateTurnstileHTML(r, t) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=512, height=512, initial-scale=1.0">
    <title>CloudFreed</title>
    <link rel="icon" type="image/png" href="./CloudFreed.png">
    <style>
        body {
            background-color: #121212;
            color: #E0E0E0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <!-- Hidden iframe -->
    <iframe height="1" width="1" style="position:absolute; top:0; left:0; border:none; visibility:hidden;"></iframe>
    
    <!-- Cloudflare Parameters -->
    <script nonce="">
        window.__CF$cv$params = { r: '${r}', t:'${t}' };
    </script>

    <!-- Load external script -->
    <script nonce="" src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>
</body>
</html>
  `;
}

/**
 * @param {CDP.Client} client
 */
async function SolveV3(client, url, html, proxy) {
  return new Promise(async (resolve, reject) => {
    let sessionId;
    const timeout = setTimeout(async () => {
      try {
        await client.DOM.disable(sessionId);
        await client.Page.disable(sessionId);
        await client.Network.disable(sessionId);
        await client.Page.navigate({ url: html }, sessionId);
        resolve({ success: false, code: 408, errormessage: "Request timed out." });
      } catch (error) {
        resolve({ success: false, code: 408, errormessage: "Request timed out." });
      }
    }, 30000); // 30-second timeout

    try {
      const targets = (await client.Target.getTargets()).targetInfos;
      const target = targets.find((target) => target.type === "page");
      const targetId = target.targetId;
      sessionId = (await client.Target.attachToTarget({ targetId, flatten: true })).sessionId;

      await client.DOM.enable(sessionId);
      await client.Page.enable(sessionId);
      await client.Network.enable(undefined, sessionId);

      await client.Network.setRequestInterception({
        patterns: [{ urlPattern: "*" }, { urlPattern: url, interceptionStage: "HeadersReceived" }],
      }, sessionId);

      client.Network.requestIntercepted(async (listener) => {
        try {
          if (listener.authChallenge) {
            if (!proxy.username || !proxy.password) {
              await client.DOM.disable(sessionId);
              await client.Page.disable(sessionId);
              await client.Network.disable(sessionId);
              await client.Page.navigate({ url: html }, sessionId);

              clearTimeout(timeout);
              resolve({
                success: false,
                code: 500,
                errormessage: "Proxy Provided requires a Username & Password, request is missing one or more of these parameters."
              });
              return;
            }
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
              authChallengeResponse: {
                response: "ProvideCredentials",
                username: proxy.username,
                password: proxy.password,
              },
            }, sessionId);
          } else if (blockResourceTypes.includes(listener.resourceType)) {
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
              rawResponse: Buffer.from('HTTP/2 404 CloudFreed Stopped media\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n').toString('base64')
            }, sessionId);
          } else if (listener.request.url === url && listener.request.method === "GET" && listener.responseStatusCode) {
            let body = await client.Network.getResponseBodyForInterception({ interceptionId: listener.interceptionId }, sessionId);

            if (body.base64Encoded) {
              body = Buffer.from(body.body, 'base64').toString('utf-8');
            }

            // Search for the script
            const script = body.match(scriptRegex);

            if (script && script[1] && script[2]) {
              await client.Network.continueInterceptedRequest({
                interceptionId: listener.interceptionId,
                rawResponse: Buffer.from('HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n' + generateTurnstileHTML(script[1], script[2])).toString('base64')
              }, sessionId);
            } else {
              await client.Network.continueInterceptedRequest({
                interceptionId: listener.interceptionId,
                rawResponse: Buffer.from('HTTP/2 401 NO CHALLENGE\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n').toString("base64")
              }, sessionId);

              await client.DOM.disable(sessionId);
              await client.Page.disable(sessionId);
              await client.Network.disable(sessionId);
              await client.Page.navigate({ url: html }, sessionId);

              clearTimeout(timeout);
              resolve({
                success: false,
                code: 500,
                errormessage: "Failed to find V3 challenge."
              });
            }
          } else {
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
            }, sessionId);

            if (listener.request.url.includes('/cdn-cgi/challenge-platform/h/b/jsd/') && !listener.responseStatusCode) {
              await waitForLoading(client, listener.requestId, sessionId);

              let cookies = await client.Network.getCookies(undefined, sessionId);
              let cookie = cookies.cookies.find(cookie => cookie.name === 'cf_clearance');

              if (cookie) {
                await client.DOM.disable(sessionId);
                await client.Page.disable(sessionId);
                await client.Network.disable(sessionId);
                await client.Page.navigate({ url: html }, sessionId);

                clearTimeout(timeout);
                resolve({ success: true, code: 200, cfClearance: cookie });
              }
            }
          }
        } catch (error) {
          console.error(error);
          // Resolve errors silently
        }
      });

      await client.Page.navigate({ url }, sessionId);
      await client.Emulation.setFocusEmulationEnabled({ enabled: true }, sessionId);
    } catch (error) {
      try {
        if (sessionId) {
          await client.DOM.disable(sessionId);
          await client.Page.disable(sessionId);
          await client.Network.disable(sessionId);
          await client.Page.navigate({ url: html }, sessionId);
        }

        clearTimeout(timeout);
        resolve({
          success: false,
          code: 500,
          error,
          errormessage: "An error occurred on our side. Please check your request or try again later."
        });
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          success: false,
          code: 500,
          error,
          errormessage: "An error occurred on our side. Please check your request or try again later."
        });
      }
    }
  });
}

export default SolveV3;
