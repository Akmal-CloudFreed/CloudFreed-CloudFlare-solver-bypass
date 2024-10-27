import CloudFreed from "./index.js"
import delay from "./lib/delay.js"

/* 
documentation for instance.Solve data.

(property) Solve?: ((data: {
  url: string;
  type: string;
  sitekey: string | undefined;
  userAgent: string | undefined;
  action: string | undefined;
  proxy: {
      scheme: string;
      host: string;
      port: number;
      username: string | undefined;
      password: string | undefined;
  };
}) => Promise<...>) | undefined
*/

const CF = new CloudFreed()

const instance = await CF.start(false, true)

console.log(instance)

console.log(await instance.Solve({
  type: "V3",
  url: "www.subber.xyz",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
}))

await delay(3723498) // optional, stop (kinda) after testing V3.

console.log(await instance.Solve({
  type: "Turnstile",
  url: "www.coronausa.com",
  sitekey: "0x4AAAAAAAH4-VmiV_O_wBN-",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
}))

console.log(await instance.Solve({
  type: "RecaptchaInvisible",
  url: "https://antcpt.com/score_detector/",
  sitekey: "6LcR_okUAAAAAPYrPe-HK_0RULO1aZM15ENyM-Mf",
  action: "homepage",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
}))

console.log(await instance.Solve({
  type: "Invisible",
  url: "discord.com",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
}))

console.log(await instance.Solve({
  type: "IUAM",
  url: "bloxmoon.com",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
}))

console.log(await instance.Solve({
  type: "V3",
  url: "www.subber.xyz",
  //proxy: { scheme: "http", host: "152.26.229.42", port: 9443 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
}))

await instance.Close()