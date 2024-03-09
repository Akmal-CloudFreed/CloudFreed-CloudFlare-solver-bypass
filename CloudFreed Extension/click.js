async function autoClicker() {
  console.log('started');

  let rootDomain;

  // Send a message to background script requesting the main page URL
  chrome.runtime.sendMessage({ action: 'getMainPageUrl' }, function(response) {
    // Extract root domain from the URL
    rootDomain = response;
    console.log('Root domain:', rootDomain);
  });

  chrome.runtime.sendMessage({ action: 'getLocalStorage' }, function(response) {
    if (!response || typeof response.key !== "number" || !response.url) {
      chrome.runtime.sendMessage({ action: 'setLocalStorage', data: { key: 0, url: rootDomain } }, function(response) {
        console.log('Data set in storage:', response);
      });
    }
  });

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

    if (document.querySelector("#challenge-stage > div > label")) {
      console.log('found button');

      chrome.runtime.sendMessage({ action: 'getLocalStorage' }, function(response) {
        if (!response || typeof response.key !== "number" || !response.url) {
          chrome.runtime.sendMessage({ action: 'setLocalStorage', data: { key: 0, url: rootDomain } }, function(response) {
            console.log('Data set in storage:', response);
          });
        } else {
          const key = response.key + 1
          chrome.runtime.sendMessage({ action: 'setLocalStorage', data: { key: key, url: rootDomain } }, function(response) {
            console.log('Data set in storage:', response);
          });

          if (key >= 4) {
            document.open();
            document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>False</title><style>body{background-color:black;color:white;font-family:Arial,sans-serif;font-size:24px;text-align:center;margin:0;padding:100px 0;}</style></head><body>false</body></html>`);
            document.close();
          }
        }
      });

      simulateMouseClick(document.querySelector("#challenge-stage > div > label"));
      
      await delay(2000);
    }
  }
}

// Call the function
autoClicker();
