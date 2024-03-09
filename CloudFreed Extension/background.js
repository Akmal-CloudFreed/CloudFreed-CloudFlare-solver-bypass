// background.js

// Example of handling messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getLocalStorage') {
    chrome.storage.local.get(["key", "url"], function(result) {
      sendResponse({key: result.key, url: result.url}); // Send the value of "key" retrieved from storage
    });
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  } else if (request.action === 'setLocalStorage') {
    const { key, url } = request.data;
    chrome.storage.local.set({ key: key, url: url }, function() {
      sendResponse({ success: true }); // Notify the content script that data has been set
    });
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  } else if (request.action === 'getMainPageUrl') {
    // Retrieve the main page URL using chrome.tabs API
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      console.log(tabs[0])
      const mainPageUrl = tabs[0].url;
      sendResponse(mainPageUrl);
    });
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  } else if (request.action === 'getAllCookies') {
    // Retrieve the main page URL using chrome.tabs API
    chrome.cookies.getAll({ domain: request.data }, function(cookies) {
      sendResponse(cookies)
    })
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  }
});