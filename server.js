import CloudFreed from "./CloudFreed.js";
import puppeteer from "puppeteer"

const url = "bloxmoon.com"

const cf = await CloudFreed(url)

const browser = await puppeteer.connect({ browserWSEndpoint: cf.ws })

const pages = await browser.pages()

const page = pages[0]

page.setViewport({
   width: 1024,
   height: 1024,
   deviceScaleFactor: 1
})

page.reload()

// do as you with with your cloudflare bypassed browser!