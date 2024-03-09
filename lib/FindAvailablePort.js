import { createServer } from 'net';

/**
 * Checks if a port is available for use.
 * @param {number} port - The port number to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the port is available, false otherwise.
 */
async function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        reject(err);
      }
    });
  });
}
  
/**
 * Finds an available port within a specified range.
 * @param {number} minPort - The minimum port number in the range.
 * @param {number} maxPort - The maximum port number in the range.
 * @returns {Promise<number>} - A promise that resolves to the available port number found within the specified range.
 */
async function FindAvailablePort(minPort, maxPort) {
  while (true) {
    const port = Math.floor(Math.random() * (maxPort - minPort + 1)) + minPort;
    if (await checkPort(port)) {
      return port;
    }
  }
}

export default FindAvailablePort