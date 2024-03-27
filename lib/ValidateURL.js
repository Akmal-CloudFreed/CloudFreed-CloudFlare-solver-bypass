function validateURL(url) {
  // Regular expression to check if the URL has a protocol specified
  const protocolRegex = /^(?:http|https):\/\//i;
  
  // If the URL doesn't have a protocol specified, prepend "http://"
  if (!protocolRegex.test(url)) {
    return "http://" + url;
  }
  
  // If the URL already has a protocol specified, return it as is
  return url;
}

export default validateURL