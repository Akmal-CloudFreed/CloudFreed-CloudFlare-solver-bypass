function CloudFlareClick() {
  return `
  // CloudFlare Turnstile solver

  async function Click() {
    const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

    function simulateMouseClick(element, clientX = null, clientY = null) {
      if (clientX === null || clientY === null) {
        const box = element.getBoundingClientRect();
        clientX = box.left + box.width / 2;
        clientY = box.top + box.height / 2;
      }

      if (isNaN(clientX) || isNaN(clientY)) {
        return;
      }

      // Send mouseover, mousedown, mouseup, click, mouseout
      const eventNames = [
        'mouseover',
        'mouseenter',
        'mousedown',
        'mouseup',
        'click',
        'mouseout',
      ];

      eventNames.forEach((eventName) => {
        const detail = eventName === 'mouseover' ? 0 : 1;
        const event = new MouseEvent(eventName, {
          detail: detail,
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: clientX,
          clientY: clientY,
        });
        element.dispatchEvent(event);
      });
    }

    while (true) {
      await delay(100);

      if (document.querySelector("body").shadowRoot.querySelector("#fCAWs6 > div > label > input[type=checkbox]")) {
        await delay(100);
      
        simulateMouseClick(document.querySelector("body").shadowRoot.querySelector("#fCAWs6 > div > label"));
      }
    }
  }

  Click()
  `
}

export default CloudFlareClick