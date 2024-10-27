delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));
getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

Object.defineProperties(MouseEvent.prototype, {
  screenX: { value: getRandomInt(1, 500) },
  screenY: { value: getRandomInt(1, 500) }
})

Object.defineProperties(window, {
  chrome: {
    value: undefined,
    configurable: false,
    enumerable: true,
    writable: false
  }
});

function NavigatorReplacement() {
  Object.defineProperties(NavigatorUAData.prototype, {
    getHighEntropyValues: {
      value: function () {
        return {
          "architecture": "x86",
          "bitness": "64",
          "brands": [
            { "brand": "Google Chrome", "version": "129" },
            { "brand": "Not=A?Brand", "version": "8" },
            { "brand": "Chromium", "version": "129" }
          ],
          "mobile": false,
          "model": "",
          "platform": "Windows",
          "platformVersion": "15.0.0",
          "uaFullVersion": "129.0.6668.58",
          "wow64": false
        };
      },
      configurable: false,  // You can set this to true if you want to redefine it later
      enumerable: true,
      writable: false  // Prevents the value from being changed
    }
  });
}

NavigatorReplacement()

const navigatorReplacement = "(" + NavigatorReplacement.toString().replace("NavigatorReplacement", "") + ")();";

const originalBlob = Blob

Blob = function(blobParts, options) {
  if (options && (options.type === "application/javascript" || options.type == "text/javascript")) {
    for (let i = 0; i < blobParts.length; i++) {
      
    }
  }

  return new originalBlob(blobParts, options);
};