import fetch from "node-fetch";
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

let preliminaryResponse = await fetch('https://api.ipify.org');
let preliminaryIp = await preliminaryResponse.text();

// Function to determine the type of proxy
function detectProxyType(proxy) {
  if (proxy.includes('http://')) {
    return 'http';
  } else if (proxy.includes('https://')) {
    return 'https';
  } else if (proxy.includes('socks')) {
    return 'socks';
  }
  return undefined;
}

// Function to create a proxy agent based on proxy type
function createProxyAgent(proxy, proxyType) {
  try {
    return proxyType === 'socks' ? new SocksProxyAgent(proxy) :
      proxyType === 'http' ? new HttpProxyAgent(proxy) :
      proxyType === 'https' ? new HttpsProxyAgent(proxy, { rejectUnauthorized: true }) :
      undefined;
  } catch(error) {
    return undefined;
  }
}

// Function to test if a URL is protected by Cloudflare
async function isCloudflareProtected(url) {
  try {
    const response = await fetch(url);
    console.log(response.status)
    const headers = response.headers.raw();
    return response.status === 403 || headers['server'] === 'cloudflare';
  } catch (error) {
    return false;
  }
}

// Function to test if a proxy works
async function testProxy(proxy, proxyType) {
  try {
    let agent = createProxyAgent(proxy, proxyType);

    const response = await fetch('https://api.ipify.org/', { agent });

    let text = await response.text();
    console.log(text, proxy, preliminaryIp)

    if (
      response.status === 200 &&
      !(text.includes(preliminaryIp)) &&
      !(text.toLowerCase().includes("routeros")) &&
      (/\b(?:\d{1,3}\.){3}\d{1,3}\b/g.test(text))
    ) return true; else return false;
  } catch(error) {
    console.log(error)
    return false;
  }
}

// Function to test URL with proxy, user agent, and determine Cloudflare protection
async function Test(url, proxy) {
  let proxyType = undefined;
  let proxyAgent = undefined;
  let proxyWorks = undefined;

  if (proxy) {
    proxyType = detectProxyType(proxy);
    if (!proxyType) {
      return { invalidProxyType: true };
    }

    proxyAgent = createProxyAgent(proxy, proxyType);
    if (!proxyAgent) {
      return { invalidProxy: true };
    }

    proxyWorks = await testProxy(proxy, proxyType);
  }

  const cloudflareProtected = await isCloudflareProtected(url);

  return {
    proxyAgent,
    proxyType,
    proxyWorks,
    cloudflareProtected,
  };
}

export default Test;
