import { accessFile } from "./fs.js";

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const curlPath = path.join(__dirname, 'curl', 'curl.exe');
const regex = /301|302|303|307/;
const defaultArgs = [
  '-w', '\n%{http_code}|%{url_effective}',
  '-k',
  '-i',
  '-H', 'Upgrade-Insecure-Requests: 1',
  '-H', 'Cache-Control: max-age=0',
  '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  '-H', 'Accept-Encoding: gzip, deflate, br, zstd',
  '-H', 'Accept-Language: en-US,en;q=0.9',
  '-H', 'Priority: u=0, i',
  '--ciphers', 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_RSA_WITH_AES_128_GCM_SHA256:TLS_RSA_WITH_AES_256_GCM_SHA384:TLS_RSA_WITH_AES_128_CBC_SHA:TLS_RSA_WITH_AES_256_CBC_SHA',
  '--compressed',
]

await accessFile(curlPath);

/**
 * 
 * @param {string} url 
 * @param {string} mode
 * @param {string} proxy 
 * @param {string[]} params
 * @returns {Promise<{ success:boolean, code:number, error:object|undefined, errormessage:string|undefined, err:string|undefined, args:string[]|undefined, redirected:boolean|undefined, headers:string[]|undefined, response:string|undefined, status:number|undefined, url:string|undefined }>}
 */
async function curl(url, mode, proxy, params) {
  return new Promise(async (resolve) => {
    try {
      if (typeof mode !== "string") {
        return resolve({ success: false, code: 400, errormessage: "Invalid mode entered, please check your parameters." });
      }

      let args = [...defaultArgs];

      if (typeof params === "object") {
        if (!params.find(param => param.startsWith("User-Agent:"))) {
          args.push('-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')
        }

        args.push(...params)
      } else {
        args.push('-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')
      }

      if (typeof proxy === "string" && (proxy.startsWith("http://") || proxy.startsWith("https://") || proxy.startsWith("socks4://") || proxy.startsWith("socks5://"))) {
        args.push('--proxy', proxy);
      } else if (proxy !== undefined) {
        return resolve({ success: false, code: 400, errormessage: "Invalid proxy entered, please check your parameters." });
      }

      if (typeof url === "string") {
        args.push(mode, url);
      } else {
        return resolve({ success: false, code: 500, errormessage: "Invalid URL entered, please check your parameters." });
      }

      const curl = spawn(path.join(__dirname, 'curl', 'curl.exe'), args);

      let out = '';
      let err = '';

      // Capture stdout and stderr streams
      curl.stdout.on('data', (data) => {
        try {
          out += data.toString();
        } catch {}
      });

      curl.stderr.on('data', (data) => {
        try {
          err += data.toString();
        } catch {}
      });

      // Handle the close event
      curl.on('close', (code) => {
        try {
          if (code !== 0) {
            return resolve({ success: false, code: 500, err, errormessage: "Error occurred when requesting from URL, please check URL/proxy." });
          }

          let outs = out.split('\r\n\r\n')

          if (typeof proxy === "string") {
            outs.shift()
          }

          let headers = outs.shift()
          let body = outs.join('\r\n\r\n')

          headers = headers.trim().split('\r\n').splice(1)

          let headersObject = {};

          headers.forEach(header => {
            let [name, ...value] = header.split(':');
            headersObject[name.trim()] = value.join(':').trim();
          });

          const lines = body.trim().split('\n');
          const data = lines.pop()
          const [responseStatusCode, responseUrl] = [parseInt(data.split('|')[0], 10), data.split('|')[1]];  // Remove and parse the last line as the status code
          const responseBodyContent = lines.join('\n');  // Join the remaining lines into a string

          let redirected = regex.test(responseStatusCode)

          return resolve({ success: true, code: 200, err, args, redirected, headers: headersObject, response: responseBodyContent, status: responseStatusCode, url: responseUrl });
        } catch (error) {
          return resolve({ success: false, code: 500, err, error, errormessage: "Error occurred while resolving curl." });
        }
      });

      // Capture any possible errors that happen during spawning or execution
      curl.on('error', (error) => {
        return resolve({ success: false, code: 500, error, errormessage: "Error occurred while running curl." });
      });
    } catch (error) {
      return resolve({ success: false, code: 500, error, errormessage: "Error occurred while starting curl." });
    }
  });
}

export default curl