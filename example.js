import CloudFreed from "./index.js";
import delay from "./lib/delay.js";

// start new CloudFreed class
const cloudfreed = new CloudFreed();

// start browser instances, arguments: headless: boolean, userAgent: string/undefined, proxy: JSON<{host: string, port: number, username:string/undefined, password: string/undefined}>/undefined
const instance = await cloudfreed.start(true);
const instance1 = await cloudfreed.start(true);
const instance2 = await cloudfreed.start(true);

// log userAgent being used in instance.
const UserAgent = instance.userAgent;

// Run both IUAM and Turnstile challenges
const [testIUAM, testTurnstile, testV3] = await Promise.all([
  instance.SolveIUAM("bloxmoon.com"),
  instance1.SolveTurnstile("www.coronausa.com", "0x4AAAAAAAH4-VmiV_O_wBN-"),
  instance2.SolveV3("discord.com")
]);

console.log(UserAgent);
console.log(testIUAM);
console.log(testTurnstile);
console.log(testV3);

// Close the instance
await instance.Close();
await instance1.Close();
await instance2.Close();