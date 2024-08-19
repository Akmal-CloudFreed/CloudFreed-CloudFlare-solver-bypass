import CloudFreed from "./index.js";
import delay from "./lib/delay.js";

const shahah = new CloudFreed();

const instance = await shahah.start(true);
const instance1 = await shahah.start(true);

const UserAgent = instance.userAgent

// Run both IUAM and Turnstile challenges
const [testIUAM, testTurnstile] = await Promise.all([
  instance.SolveIUAM("https://bloxmoon.com/"),
  instance1.SolveTurnstile("https://www.coronausa.com/", "0x4AAAAAAAH4-VmiV_O_wBN-")
]);

console.log(UserAgent)
console.log(testIUAM);
console.log(testTurnstile);

// Close the instance
await instance.Close();
await instance1.Close();