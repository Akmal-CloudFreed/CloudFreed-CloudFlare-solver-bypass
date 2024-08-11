// Made by Akmal & theOnly

import delay from "./delay.js";
import CDP from "chrome-remote-interface";

const banner = 'var banner=document.createElement("div");banner.id="cloudfreed-banner",banner.textContent="Being Solved by CloudFreed...",document.body.prepend(banner),banner.style.position="fixed",banner.style.top="0",banner.style.left="0",banner.style.width="100%",banner.style.padding="10px 0",banner.style.backgroundColor="#1E1E1E",banner.style.color="#E0E0E0",banner.style.fontSize="18px",banner.style.textAlign="center",banner.style.boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)",banner.style.zIndex="100",banner.style.animation="slideDown 0.5s ease-out";var styleSheet=document.createElement("style");styleSheet.type="text/css",styleSheet.innerText="@keyframes slideDown{from{transform:translateY(-100%);}to{transform:translateY(0);}}",document.head.appendChild(styleSheet);'
const blockResourceTypes = ["Image", "Font", "Stylesheet", "Other", "Media"];
const eventNames = ['mouseMoved', 'mousePressed', 'mouseReleased'];

/**
 * @param {CDP.Client} client
*/

async function Solver(client, sessionId) {
  await delay(5000)
  try {
    const { nodes } = await client.DOM.getFlattenedDocument({
      depth: -1,
      pierce: true,
    }, sessionId);

    const turnstileNode = nodes.find(
      (node) =>
        node.nodeName === "IFRAME" &&
        node.attributes?.includes("Widget containing a Cloudflare security challenge")
    );

    if (!turnstileNode) {
      return;
    }
    if (!turnstileNode) {
      // If the node is not found, wait and retry
      await delay(1000);
    }

    // Try to get the box model (dimensions) of the node
    const location = await client.DOM.getBoxModel({ nodeId: turnstileNode.nodeId }, sessionId);
    const [x1, y1, x2, y2, x3, y3, x4, y4] = location.model.content;

    // Calculate center
    const x = (x1 + x3) / 2;
    const y = (y1 + y3) / 2;

    await delay(1000);

    await client.Input.dispatchMouseEvent({
      type: 'mouseMoved',
      x,
      y,
    }, sessionId);

    // Press the left mouse button
    await client.Input.dispatchMouseEvent({
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1,
    }, sessionId);

    // Release the left mouse button
    await client.Input.dispatchMouseEvent({
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1,
    }, sessionId);
  } catch (error) {}
}

/**
 * @param {CDP.Client} client
*/

async function SolveIUAM(client, url, html, proxy) {
  return new Promise(async (resolve, reject) => {
    let sessionId;

    try {

      const targets = (await client.Target.getTargets()).targetInfos
      const target = targets.find((target) => target.type === "page")
      const targetId = target.targetId
      sessionId = (await client.Target.attachToTarget({ targetId, flatten: true })).sessionId;

      await client.DOM.enable(sessionId);
      await client.Page.enable(sessionId);
      await client.Network.enable(sessionId)

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
          } else {
            await client.Network.continueInterceptedRequest({
              interceptionId: listener.interceptionId,
            }, sessionId);

            if (listener.request.url.includes('challenges.cloudflare.com') && listener.resourceType == "Document") {
              client.Runtime.evaluate({ expression: banner }, sessionId)
              Solver(client, sessionId)
            }
          }
        } catch (error) {
          resolve({
            success: false,
            code: 500,
            error,
            errormessage: "An error occurred on our side. Please check your request or try again later."
          });
        }
      });

      // Function to check for the cf_clearance cookie
      async function checkCfClearanceCookie() {
        const cookies = await client.Network.getCookies(undefined, sessionId);
        return cookies.cookies.find(cookie => cookie.name === 'cf_clearance');
      }

      // Wait for the cf_clearance cookie to exist
      async function waitForCfClearanceCookie() {
        let cookie = null;
        while (!cookie) {
          cookie = await checkCfClearanceCookie();
          if (cookie) {
            await delay(5000);
            cookie = await checkCfClearanceCookie();
            return cookie;
          }
          // Wait for 1 second before checking again
          await delay(1000)
        }
      }

      await client.Page.navigate({ url }, sessionId);

      const cfClearance = await waitForCfClearanceCookie()

      const cfClearanceHeader = `${cfClearance.name}=${cfClearance.value};`

      await client.DOM.disable(sessionId);
      await client.Page.disable(sessionId);
      await client.Network.disable(sessionId)
      await client.Page.close(sessionId)

      resolve({ success: true, code: 200, cfClearance, cfClearanceHeader });
    } catch (error) {
      await client.Page.close(sessionId)

      resolve({
        success: false,
        code: 500,
        error,
        errormessage: "An error occurred on our side. Please check your request or try again later."
      });
    }
  });
}

export default SolveIUAM;
