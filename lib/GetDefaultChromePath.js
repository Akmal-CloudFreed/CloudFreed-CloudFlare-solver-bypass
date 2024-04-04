import os from "os";

function GetDefaultChromePath() {
  const platform = os.platform();
  
  switch(platform) {
    case 'win32':
      if (process.arch === 'x64') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else {
        // Default path to Chrome on 32-bit Windows
        return 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
      }
    case 'darwin':
      // Default path to Chrome on macOS
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux':
      // Default path to Chrome on Linux
      return '/usr/bin/google-chrome';
    default:
      return null; // Unsupported platform
  }
}

export default GetDefaultChromePath