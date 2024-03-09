import { spawn } from "child_process";

function KillProcess(pid) {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    const command = (platform === 'win32') ? 'taskkill' : 'kill';
    const args = (platform === 'win32') ? ['/F', '/PID', pid.toString(), '/T'] : ['-9', pid.toString()];

    const killProc = spawn(command, args);

    killProc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        resolve();
      }
    });

    killProc.on('error', (err) => {
      resolve();
    });
  });
}

export default KillProcess