function ConvertToCDPHeaders(headers) {
  const cdpHeaders = [];
  for (const [name, valueArray] of Object.entries(headers)) {
    for (const value of valueArray) {
      cdpHeaders.push(`${name}: ${value}`);
    }
  }

  return cdpHeaders;
}

export default ConvertToCDPHeaders