import os from "os"

function GetHomeDirectory() {
  const platform = os.platform();
    
  switch(platform) {
    case 'win32':
      return process.env.USERPROFILE !== undefined ? process.env.USERPROFILE : null; // On Windows
    case 'darwin':
      return process.env.HOME !== undefined ? process.env.HOME : null; // On macOS
    case 'linux':
      return process.env.HOME !== undefined ? process.env.HOME : null; // On Linux
    default:
      return null; // Unsupported platform
  }
}

export default GetHomeDirectory