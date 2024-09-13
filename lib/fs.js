import fs from "fs/promises";

async function readFile(path) {
  try {
    await fs.access(path);

    // Read the file
    const data = await fs.readFile(path, "utf-8");
    return data;
  } catch (err) {
    // Handle specific errors
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    } else {
      throw new Error(`Unable to read file: ${err.message}`);
    }
  }
}

async function writeFile(path, datuh) {
  try {
    await fs.access(path);

    // Read the file
    const data = await fs.writeFile(path, datuh, "utf-8")
    return data;
  } catch (err) {
    // Handle specific errors
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    } else {
      throw new Error(`Unable to read file: ${err.message}`);
    }
  }
}

async function accessFile(path) {
  try {
    await fs.access(path);

    return true;
  } catch (err) {
    // Handle specific errors
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    } else {
      throw new Error(`Unable to read file: ${err.message}`);
    }
  }
}

export { readFile, writeFile, accessFile }