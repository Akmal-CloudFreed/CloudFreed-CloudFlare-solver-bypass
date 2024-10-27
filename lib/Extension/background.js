const ALL_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
];

async function setUserAgentOverride(userAgent) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1], // Remove any existing rule with ID 1
    addRules: [
      {
        id: 1,
        priority: 99,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "User-Agent",
              operation: "set",
              value: userAgent
            },
            {
              header: "Accept-Encoding",
              operation: "set",
              value: ""
            },
            {
              header: "x-Client-Data",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Mobile",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Platform",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Platform-Version",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Arch",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Model",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Full-Version",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Bitness",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-Full-Version-List",
              operation: "remove"
            },
            {
              header: "Sec-CH-UA-WoW64",
              operation: "remove"
            }
          ],
          responseHeaders: [
            {
              header: "Cache-Control",
              operation: "set",
              value: "no-store, no-cache, must-revalidate, proxy-revalidate"
            }
          ]
        },
        condition: {
          resourceTypes: ALL_RESOURCE_TYPES,
          urlFilter: "*"
        }
      }
    ]
  });
};

function updateProxy(proxyConfig) {
  if (!proxyConfig || typeof proxyConfig.scheme !== "string" || typeof proxyConfig.host !== "string" || typeof proxyConfig.port !== "number") {
    console.error('Invalid proxy configuration:', JSON.stringify(proxyConfig));
    return;
  }

  chrome.proxy.settings.set(
    {
      value: {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: proxyConfig.scheme,
            host: proxyConfig.host,
            port: parseInt(proxyConfig.port, 10)
          }
        }
      },
      scope: 'regular'
    },
    () => {
      console.log('Proxy updated to:', proxyConfig);
    }
  );
}

function clearProxy() {
  chrome.proxy.settings.clear({}, function() {
    if (chrome.runtime.lastError) {
        console.error('Error clearing proxy settings:', chrome.runtime.lastError);
    } else {
        console.log('Proxy settings cleared successfully.');
    }
  });
}

self.consoleMessageHandler = (message) => {
  console.log("Received message from DevTools console:", JSON.stringify(message));

  if (typeof message === "object" && message.data && message.type === "modifyData") {
    if (message.data.userAgent) {
      setUserAgentOverride(message.data.userAgent)
    }
    if (message.data.proxy) {
      updateProxy(message.data.proxy)
    } else {
      clearProxy()
    }
  }
};