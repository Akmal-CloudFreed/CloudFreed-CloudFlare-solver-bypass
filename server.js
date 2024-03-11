import CloudFreed from "./CloudFreed.js";
import puppeteer from "puppeteer"

const url = "bloxmoon.com"

const cf = await CloudFreed(url)

console.log('CloudFreed result:', cf);
console.log('CloudFreed json:', JSON.stringify(cf.json));

const browser = await puppeteer.connect({ browserWSEndpoint: cf.ws })

const pages = await browser.pages()

const page = pages[0]

page.reload()

// do as you with with your cloudflare bypassed browser!