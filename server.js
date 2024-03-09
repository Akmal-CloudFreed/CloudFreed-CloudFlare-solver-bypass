import CloudFreed from "./CloudFreed.js";
import TorControl from 'tor-control';

// Connect to the Tor control port
var control = new TorControl({
    password: "D4RKWASHERE",
    host: "127.0.0.1"
});
 
control.signalNewnym(function (err, status) { // Get a new circuit
   if (err) {
      return console.error(err);
   }
   console.log(status.messages[0]); // --> "OK"
});

const cf_clearences = await CloudFreed("bloxmoon.com", "socks5://127.0.0.1:9050")
console.log( cf_clearences)