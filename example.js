import CloudFreed from "./index.js";
import delay from "./lib/delay.js";

const shahah = new CloudFreed()

const instance = await shahah.start(false)

const testTurnstile = await instance.SolveTurnstile("https://www.coronausa.com/", "0x4AAAAAAAH4-VmiV_O_wBN-")

console.log(testTurnstile)

const cf = testTurnstile.response;

console.log(cf)

const testIUAM = await instance.SolveIUAM("https://bloxmoon.com/")

console.log(testIUAM)

const response = testIUAM.cfClearance

console.log(response)