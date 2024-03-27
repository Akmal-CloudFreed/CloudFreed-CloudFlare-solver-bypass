import fs from 'fs/promises';
import path from 'path';

/**
 * Delete unused temporary user data folders.
 * @param {string} cloudflareBypassDir - The directory path for cloudflare bypass.
 */
async function DeleteTempUserDataFolders(cloudflareBypassDir) {
  try {
    await fs.mkdir(cloudflareBypassDir, { recursive: true });

    const contents = await fs.readdir(cloudflareBypassDir);

    for (const item of contents) {
      const itemPath = path.join(cloudflareBypassDir, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory() && item.startsWith('CloudFreed_')) {
        try {
          await fs.rm(itemPath, { recursive: true });
        } catch {}
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
}

export default DeleteTempUserDataFolders