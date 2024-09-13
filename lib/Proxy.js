import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

class Proxy {
  constructor({ http, https, socks }) {
    if (http) {
      this.agent = new HttpProxyAgent(http);
    } else if (https) {
      this.agent = new HttpsProxyAgent(https);
    } else if (socks) {
      this.agent = new SocksProxyAgent(socks);
    } else {
      throw new Error("Invalid proxy type. Please provide either an http, https, or socks proxy.");
    }
  }

  getAgent() {
    return this.agent;
  }
}

export default Proxy;