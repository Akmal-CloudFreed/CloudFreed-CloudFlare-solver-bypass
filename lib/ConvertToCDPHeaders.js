function ConvertToCDPHeaders(headers) {
  // Check if headers is a JSON object
  if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
    return undefined
  }

  // Convert headers to CDP format
  const formattedHeaders = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`);

  return formattedHeaders;
}

export default ConvertToCDPHeaders;