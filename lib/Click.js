import CDP from "chrome-remote-interface";
import delay from "./delay.js";

/**
 * @param {CDP.Client} client
 */
async function Click(client, sessionId) {
  let connected = true
  while (connected) {
    try {
      await delay(1000);

      try {
        await client.Target.getTargets();
      } catch (error) {
        console.log('Client closed');
        connected = false
      }

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

      await delay(2000);

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

export default Click