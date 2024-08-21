import delay from "./delay.js";
import { EventEmitter } from 'events';
import CDP from "chrome-remote-interface";

const blockResourceTypes = ["Image", "Font", "Stylesheet", "Other", "Media"];

function generateTurnstileHTML(sitekey) {
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
    <form id="turnstile-form" action="/submit" method="POST">
        <div id="cf-turnstile" class="cf-turnstile" data-sitekey="${sitekey}"></div>
    </form>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</body>
</html>
  `;
}

/**
 * @param {CDP.Client} client
 */
async function Solver(client, eventEmitter, sessionId) {
  let keepRunning = true;

  eventEmitter.once('stop', () => {
    keepRunning = false;
  });

  while (keepRunning) {
    try {
      await delay(1000);

      const { nodes } = await client.DOM.getFlattenedDocument(
        {
          depth: -1,
          pierce: true,
        },
        sessionId
      );

      const turnstileNode = nodes.find(
        (node) =>
          node.nodeName === "IFRAME" &&
          node.attributes?.includes("Widget containing a Cloudflare security challenge")
      );

      if (!turnstileNode) {
        continue;
      }

      // Try to get the box model (dimensions) of the node
      const location = await client.DOM.getBoxModel(
        { nodeId: turnstileNode.nodeId },
        sessionId
      );
      const [x1, y1, x2, y2, x3, y3, x4, y4] = location.model.content;

      // Calculate center
      const x = (x1 + x3) / 2;
      const y = (y1 + y3) / 2;

      await delay(1000);

      await client.Input.dispatchMouseEvent(
        {
          type: 'mouseMoved',
          x,
          y,
        },
        sessionId
      );

      // Press the left mouse button
      await client.Input.dispatchMouseEvent(
        {
          type: 'mousePressed',
          x,
          y,
          button: 'left',
          clickCount: 1,
        },
        sessionId
      );

      // Release the left mouse button
      await client.Input.dispatchMouseEvent(
        {
          type: 'mouseReleased',
          x,
          y,
          button: 'left',
          clickCount: 1,
        },
        sessionId
      );
    } catch (error) {
      // Handle errors silently
    }
  }
}

/**
 * @param {CDP.Client} client
 */
async function SolveTurnstile(client, url, sitekey, html, proxy) {
  return new Promise(async (resolve, reject) => {
    let sessionId;
    const eventEmitter = new EventEmitter();
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
      await client.Network.enable(sessionId);

      await client.Network.setRequestInterception({
        patterns: [{ urlPattern: "*" }],
      }, sessionId);

      client.Network.requestIntercepted(async (listener) => {
        try {
          if (listener.authChallenge) {
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
          } else if (listener.request.url.includes(url)) {
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
              rawResponse: Buffer.from('HTTP/2 200 OK\r\nContent-Type: text/html\r\nContent-Length: 0\r\n\r\n' + generateTurnstileHTML(sitekey)).toString('base64')
            }, sessionId);
          } else {
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
            }, sessionId);
          }
        } catch (error) {
          // Resolve errors silently
        }
      });

      await client.Page.navigate({ url }, sessionId);
      Solver(client, eventEmitter, sessionId);

      async function waitForTurnstileValue() {
        while (true) {
          try {
            await delay(1000);

            // Get the document's flattened node tree
            const { root: { nodeId: documentNodeId } } = await client.DOM.getDocument({}, sessionId);

            // Query for the specific input element
            const { nodeId } = await client.DOM.querySelector({
              nodeId: documentNodeId,
              selector: '#cf-turnstile > div > input'
            }, sessionId);

            if (nodeId) {
              // Get the input attributes
              const { attributes } = await client.DOM.getAttributes({ nodeId }, sessionId);

              // Find the index of the 'value' attribute
              const valueIndex = attributes.indexOf('value');
              if (valueIndex !== -1) {
                // The value is at the index right after 'value'
                const inputValue = attributes[valueIndex + 1];
                if (inputValue) {
                  return inputValue;
                }
              }
            }
          } catch (error) {
            // Resolve errors silently
          }
        }
      }

      const response = await waitForTurnstileValue();

      await client.DOM.disable(sessionId);
      await client.Page.disable(sessionId);
      await client.Network.disable(sessionId);
      eventEmitter.emit('stop');

      await client.Page.navigate({ url: html }, sessionId);

      clearTimeout(timeout);
      resolve({ success: true, code: 200, response });
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

export default SolveTurnstile;
