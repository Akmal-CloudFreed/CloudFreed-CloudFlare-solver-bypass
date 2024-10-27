chrome.runtime.sendMessage({ action: "getTabId" }, function(response) {
  if (chrome.runtime.lastError || !response?.tabId) {
    console.error("Error:", chrome.runtime.lastError.message);
  }
  originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
    this.addEventListener("readystatechange", function() {
      if (this.readyState == 4) {
        console.log('ahh')
        this.setRequestHeader("x-proxy-agent", "your-header-value");
      }
    }, false);
    console.log('ahh')
    originalOpen.call(this, method, url, async, user, pass);
  };
});