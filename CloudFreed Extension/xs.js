console.log('started');

const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

let alreadychanged = false

// Function to check for the presence of the #turnstile-wrapper element
async function checkForTurnstileWrapper() {
  if (!localStorage["xs"]) {
    const turnstileElement = document.body.innerHTML;
    console.log(turnstileElement)
    if (turnstileElement && alreadychanged === false && turnstileElement !== "true" && turnstileElement !== "false") {
        alreadychanged = true;
        // Create a container div for CloudFreed
        var cloudFreedContainer = document.createElement('div');
        cloudFreedContainer.id = 'cloudfreed-container';
        cloudFreedContainer.style.position = 'fixed';
        cloudFreedContainer.style.top = '0';
        cloudFreedContainer.style.left = '0';
        cloudFreedContainer.style.width = '100%';
        cloudFreedContainer.style.height = '100%';
        cloudFreedContainer.style.backgroundColor = '#141414'; // Darker background
        cloudFreedContainer.style.color = 'white';
        cloudFreedContainer.style.fontFamily = 'Arial, sans-serif';
        cloudFreedContainer.style.textAlign = 'center';
        cloudFreedContainer.style.margin = '0';
        cloudFreedContainer.style.padding = '100px 0';
        cloudFreedContainer.style.zIndex = '9999'; // Ensure it's on top

        // Add CloudFreed HTML content
        cloudFreedContainer.innerHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CloudFreed</title>
            <link rel="icon" type="image/png" href="./CloudFreed.png">
            <style>
                body {
                    background-color: #141414; /* Darker background for better contrast */
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    margin: 0;
                    padding: 100px 0;
                    position: relative;
                }
                .title {
                    font-size: 36px;
                }
                .title2 {
                    font-size: 24px;
                }
                .content {
                    margin-top: 50px;
                    padding: 20px;
                    border: 2px solid white;
                }
                .cloudfreed-container {
                    position: relative;
                    display: inline-block;
                }
                .cloudfreed-logo {
                    width: 128px;
                    height: auto;
                    position: relative;
                    animation: moveUpDown 2s infinite alternate;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: solid 6px rgb(100, 0, 172); /* Changed color to blue */
                    border-radius: 50%;
                    border-right-color: transparent;
                    border-bottom-color: transparent;
                    animation: rotate 1s linear infinite;
                }
                .spinner-container {
                    position: relative;
                    display: inline-block;
                    right: 0;
                    margin-top: -20px;  /* Additional lift with margin-top */
                }

                @keyframes moveUpDown {
                    0% { top: -10px; }  /* Start position further up */
                    100% { top: 20px; }
                }
                @keyframes rotate {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                .escape {
                    color: red; /* Red text color for "ESCAPE CLOUDFLARE" */
                }
                .search-bar {
                    margin-top: 20px; /* Adjust the margin as needed */
                    width: 300px; /* Adjust the width as needed */
                    height: 40px;
                    border: 2px solid white;
                    border-radius: 5px;
                    padding: 5px 10px;
                    font-size: 16px;
                    background-color: #333; /* Dark background color */
                    color: white;
                    outline: none; /* Remove outline */
                }

                .search-bar::placeholder {
                    color: #aaa; /* Placeholder text color */
                }

                .search-bar:focus {
                    border-color: #fff; /* Border color when focused */
                }
            </style>
        </head>

        <body>
            <div class="spinner-container">
                <div class="spinner"></div>
            </div>
            <div class="content">
                <h1>Welcome to CloudFreed Browser!</h1>
                <div class="title2">Loading, Please Be Patient...</div>
                <p>🚀 CloudFreed is a revolutionary new browser designed to provide you with unparalleled freedom while browsing the web. 🌐</p>
                <p>With CloudFreed, you can access any website without being restricted by annoying <span class="escape">captchas</span> or <span class="escape">Cloudflare's protection</span>. 🛡️</p>
                <p>We believe in a free and open internet for everyone, and CloudFreed is our contribution to making that a reality. 🌟</p>
            </div>
            <br>
                <div id="chromeVersion" class="title"></div>
            </br>
            <div class="title2">CloudFreed is safe for puppeteer or anything similar.</div>
            <script>
                window.onload = function() {
                    // Function to get Chrome version
                    function getChromeVersion() {
                        var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
                        return raw ? parseInt(raw[2], 10) : false;
                    }
            
                    // Get Chrome version
                    var version = getChromeVersion();
            
                    // Display Chrome version on the page
                    var message = "Relax, you're on ";

                    if (version) {
                        message += "Chrome v" + version + ".";
                    } else {
                        message += "a browser that is not Chrome.";
                    }

                    document.getElementById('chromeVersion').textContent = message;
                };  
            </script>
            <script>
                // Get the search input element
                const searchInput = document.getElementById('searchInput');

                // Add event listener for key press event
                searchInput.addEventListener('keypress', function(event) {
                    // Check if Enter key is pressed (key code 13)
                    if (event.key === 'Enter') {
                        // Get the URL entered into the input field
                        let url = searchInput.value.trim();
                        // Check if the URL is not empty
                        if (url) {
                            // Check if the URL includes 'http://' or 'https://'
                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                // If not, prepend 'http://'
                                url = 'http://' + url;
                            }
                            // Redirect to the entered URL
                            window.location.href = url;
                        }
                        }
                    });
                </script>
            </body>
        </html>
        `;

        // Inject CloudFreed container into the body
        document.body.appendChild(cloudFreedContainer);

        // Function to get Chrome version
        function getChromeVersion() {
            var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
            return raw ? parseInt(raw[2], 10) : false;
        }

        // Get Chrome version
        var version = getChromeVersion();

        // Display Chrome version
        var message = "Relax, you're on ";

        if (version) {
            message += "Chrome v" + version + ".";
        } else {
            message += "a browser that is not Chrome.";
        }

        document.getElementById('chromeVersion').textContent = message;
    } else {
        setTimeout(checkForTurnstileWrapper, 100);
    }
  }
}

checkForTurnstileWrapper()

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
            const cfClearanceCookie = response.find(cookie => cookie.name === 'cf_clearance');
            
            if (cfClearanceCookie && !localStorage["xs"]) {
              localStorage["xs"] = true

              document.open();
              document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>True</title><style>body{background-color:black;color:white;font-family:Arial,sans-serif;font-size:24px;text-align:center;margin:0;padding:100px 0;}</style></head><body>true</body></html>`);
              document.close();
            } else {
              localStorage["xs"] ? undefined : console.log('no cf_clearance cookie...');
            }
          });
        }
      } else {
        console.log('hosts dont match...')
        // Add logic for when hosts don't match
      }
    }
  });
};

xs();
