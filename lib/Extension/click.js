async function ShadowFinder() {
  const eventNames = [ 'mouseover', 'mouseenter', 'mousedown', 'mouseup', 'click', 'mouseout' ];
  const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));
  const randomInteger = (n,r) => Math.floor(Math.random()*(r-n+1))+n;
  const originalAttachShadow = Element.prototype.attachShadow;
  const getBoundingClientRect = (box) => [randomInteger(box.left, box.left + box.width), randomInteger(box.top, box.top + box.height)];
  const dispatchEvent = (element, eventName, clientX, clientY) => element.dispatchEvent(new MouseEvent(eventName, { detail: eventName === 'mouseover' ? 0 : 1, view: window, bubbles: true, cancelable: true, clientX, clientY }));
  const simulateMouseClick = (element, clientX = null, clientY = null) => {[clientX, clientY] = getBoundingClientRect(element.getBoundingClientRect()); eventNames.forEach((eventName) => dispatchEvent(element, eventName, clientX, clientY))};
  const getTargetElement = (shadowRoot) => shadowRoot.querySelector('div[style*="display: grid"] > div > label');
  const clickElement = async (element) => {await delay(randomInteger(500, 1000));simulateMouseClick(element);};
  const isElementClicked = (element) => {const input = element.querySelector("input");return input && input.getAttribute('aria-checked') !== null;};
  const Click = async (shadowRoot) => { while (true) { await delay(100); const element = getTargetElement(shadowRoot); if (element && await clickElement(element) && isElementClicked(element)) return; } };
  const definetoString = (Property) => Object.defineProperty(Property, 'toString', { value: function() { return 'function attachShadow() { [native code] }' } });
  const attachShadow = (() => {Element.prototype.attachShadow = function(init) {let shadowRoot = originalAttachShadow.call(this, init); Click(shadowRoot); return shadowRoot}; definetoString(Element.prototype.attachShadow)})()
}

const attachShadowReplacement = "(" + ShadowFinder.toString().replace("ShadowFinder", "") + ")();";
const attachShadowReplacementScript = document.createElement("script")
attachShadowReplacementScript.textContent = attachShadowReplacement
document.documentElement.appendChild(attachShadowReplacementScript)