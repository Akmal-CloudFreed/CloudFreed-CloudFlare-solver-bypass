import CloudFreed from "./index.js"

const cf = new CloudFreed()

/* 
    response looks like this (if successfull)
{
    "success":true,
    "cfClearance": {
        "name":"cf_clearance",
        "value":"xUPhCYPAI5KSXaILM0MME5s_H8LDcGZHPPY4TCbyHfc-1711067062-1.0.1.1-xGyoME96_S3HQzL6uJUWkr.2MXquizYEEIpbqyym2tfsD5hMzcUQeGRbK9.H85bA.QINqMgkpW7X9Y3nYG5_sQ",
        "domain":".bloxmoon.com",
        "path":"/",
        "expires":1742603068.034552,
        "size":161,
        "httpOnly":true,
        "secure":true,
        "session":false,
        "sameSite":"None",
        "priority":"Medium",
        "sameParty":false,
        "sourceScheme":"Secure",
        "sourcePort":443
    },
    "cfClearenceHeader":"cf_clearance=xUPhCYPAI5KSXaILM0MME5s_H8LDcGZHPPY4TCbyHfc-1711067062-1.0.1.1-xGyoME96_S3HQzL6uJUWkr.2MXquizYEEIpbqyym2tfsD5hMzcUQeGRbK9.H85bA.QINqMgkpW7X9Y3nYG5_sQ;",
    "dataDir":"C:\\Users\\johna\\CloudFreed\\CloudFreed_1711067053915",
    "port":58428
}
*/

// question mark means optional
// args for cf.get: URL: string, headless?: boolean, proxy?: string

const URL = "bloxmoon.com" //example URL
const headless = true
//const proxy = "your proxy"

/* proxy examples: 
    http://192.168.1.1:45994
    https://192.168.1.1:48212
    socks4://192.168.1.1:12849
    socks5://192.168.1.1:12849

User+Pass proxy examples:
    http://username:password@proxy.example.com:port
    https://username:password@proxy.example.com:port
    socks4://username:password@proxy.example.com:port
    socks5://username:password@proxy.example.com:port
*/

const cloudfreed = await cf.get(URL, headless)

console.log(JSON.stringify(cloudfreed))
