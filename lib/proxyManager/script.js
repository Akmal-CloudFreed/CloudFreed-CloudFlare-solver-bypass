// content-script.js
(function() {
    'use strict';
    Object.defineProperties(window, {
        chrome: {
            value: undefined,
            configurable: false,
            enumerable: true,
            writable: false
        }
    })
})();

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let screenX = getRandomInt(800, 1200);
let screenY = getRandomInt(400, 600);

Object.defineProperty(MouseEvent.prototype, 'screenX', { value: screenX });

Object.defineProperty(MouseEvent.prototype, 'screenY', { value: screenY });