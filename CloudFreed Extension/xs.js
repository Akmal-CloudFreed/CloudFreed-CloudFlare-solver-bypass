console.log('started');

const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

// Execute the content script logic after the page has loaded completely
async function xs() {
  chrome.runtime.sendMessage({ action: 'getLocalStorage' }, async function(response) {
    console.log(response)
    if (response && typeof response.key === "number" && response.url) {
      console.log(window.location.hostname, response.url)
      if (response.url.includes(window.location.hostname.trim())) {
        console.log("hosts match!")

        while (true) {
          await delay(1000)

          if (response.key >= 4) {
            document.open();
            document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>False</title><style>body{background-color:black;color:white;font-family:Arial,sans-serif;font-size:24px;text-align:center;margin:0;padding:100px 0;}</style></head><body>false</body></html>`);
            document.close();
          }

          chrome.runtime.sendMessage({ action: 'getAllCookies', data: window.location.hostname }, async function(response) {
            // Check if cf_clearance cookie exists
            const cfClearanceCookie = response.find(cookie => cookie.name === 'cf_clearance');
            
            if (cfClearanceCookie && !localStorage["xs"]) {
              // If cf_clearance cookie exists, redirect to http://localhost/true
              localStorage["xs"] = true

              document.open();
              document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>True</title><style>body{background-color:black;color:white;font-family:Arial,sans-serif;font-size:24px;text-align:center;margin:0;padding:100px 0;}</style></head><body>true</body></html>`);
              document.close();
            } else {
              localStorage["xs"] ? undefined : console.log('no cf_clearance cookie...');
            }
          });
        }
      } else {console.log('hosts dont match...')}
    }
  });
};

xs()