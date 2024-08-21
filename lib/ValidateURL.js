/**
 * Validates and formats the given URL by ensuring it has a protocol, removing spaces,
 * and ensuring it ends with a forward slash.
 * 
 * @param {String} url - The URL to validate and format.
 * @returns {String} - The formatted URL.
 */
function validateURL(url) {
  if (typeof url === "string") {
    // Trim any leading/trailing whitespace
    url = url.trim();

    // Ensure the URL has a protocol; if not, prepend "https://"
    const hasProtocol = /^https?:\/\//i.test(url);
    if (!hasProtocol) {
        url = "https://" + url;
    }

    // Remove all spaces from the URL
    url = url.replace(/ /g, "");

    // Ensure the URL ends with a single forward slash
    if (!url.endsWith("/")) {
        url += "/";
    }

    return url;
  }
}

export default validateURL;
