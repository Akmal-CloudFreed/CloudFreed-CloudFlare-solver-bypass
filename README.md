## STATUS: Active

Updates are on the way!
V1.2.1 Just released, please report any errors in Issues.

## Notice
If you like the repo, please consider starring it, starring repos will help it spread.
CloudFreed is 100% Free, CloudFreed can stop working at any time.
Files may have problems loading correctly, this is because of the request interception. This may be fixed in the future!

## Introduction
<div style="text-align:center;">
  <img src="html/CloudFreed.png" alt="CloudFreed Logo" width="48" style="float:left; margin-right:10px;">
  <h1>CloudFreed v1.2.1</h1>

  [Join the CloudFreed Server](https://discord.gg/8F852cXVbX)
</div>

CloudFreed is a powerful tool designed to bypass Cloudflare anti-bot protection, allowing users to access websites without being restricted by captchas or Cloudflare's security measures.

## Installation
Before using CloudFreed, ensure that you have Node.js installed on your system. If not, you can download and install it from [Node.js website](https://nodejs.org/).

Once Node.js is installed, follow these steps to set up CloudFreed:

1. Clone or download the CloudFreed repository to your local machine.
2. Extract the file.
3. Open a terminal and navigate to the directory where you have cloned/downloaded CloudFreed.
4. Run the following command to install dependencies:

    ```
    npm i
    ```
    alternatively, you can use:
    ```
    npm install
    ```
## Usage
After installing dependencies, you can start using CloudFreed. The main functionality is provided through the `CloudFreed` function, which returns the `cf_clearence` cookie necessary for bypassing Cloudflare protection.

To use CloudFreed in your project, follow these steps:

1. Open the `server.js` file located in the CloudFreed directory.
2. Import the `CloudFreed` function into your project.
3. Call the `CloudFreed` function with the desired URL as an argument. This function will return the `cf_clearence` cookie.
4. Use the `cf_clearence` cookie in your HTTP requests to the target website to bypass Cloudflare protection.

### Example:
Find example in example.js

## Contribution

Suggestions and pull requests are welcomed!.

## Support the project

Supporting the project will most likely contribute to the creation of newer versions, and maybe even newer projects!
Please consider donating if you like the project.

[Support me at ko-fi.com](https://ko-fi.com/akmal2)

---

## Note
CloudFreed is intended for educational and research purposes only. Please use it responsibly and respect the terms of service of the websites you visit.
