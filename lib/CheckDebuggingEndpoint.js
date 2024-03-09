async function CheckDebuggingEndpoint(port, maxAttempts = 10, delay = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        attempts++;
        const url = `http://127.0.0.1:${port}/json/version`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, delay)); // Wait for a short delay before retrying
    }
    console.error(`Maximum attempts (${maxAttempts}) reached. Could not connect to Chrome.`);
    return null;
}

export default CheckDebuggingEndpoint