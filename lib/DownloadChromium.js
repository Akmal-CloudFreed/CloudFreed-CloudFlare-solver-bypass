import extract from "extract-zip";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";

async function DownloadChromium(dir, zip=path.join(dir, "Chromium.zip")) {
  try {
    await fs.promises.access(path.join(dir, 'chrome-win', 'chrome.exe'));
    console.log('Chromium already exists.');
    return path.join(dir, 'chrome-win', 'chrome.exe');
  } catch (error) {
    // File does not exist, proceed with downloading
  }
  return await new Promise(async (resolve) => {
    console.log('Chromium not installed, downloading now...')

    const response = await fetch('https://storage.googleapis.com/chromium-browser-snapshots/Win/1278582/chrome-win.zip');
    if (!response.ok) {
        throw new Error(`Failed to download Chromium build: ${response.statusText}`);
    }

    // Save the zip file to disk
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(zip, buffer);

    console.log('Download complete! Installing...')

    try {
      await extract(zip, { dir: dir })
    } catch(err) {
      console.error('Error occured while extracting:', err)
    }

    console.log('Chromium installed successfully!')

    resolve(path.join(dir, 'chrome-win', 'chrome.exe'));
  })
}

export default DownloadChromium