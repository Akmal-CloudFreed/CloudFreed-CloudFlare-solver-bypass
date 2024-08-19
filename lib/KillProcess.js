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
        resolve(new Error(`Failed to kill process ${pid}. Exit code: ${code}`));
      }
    });

    killProc.on('error', (err) => {
      resolve(new Error(`Error killing process ${pid}: ${err.message}`));
    });
  });
}

export default KillProcess;