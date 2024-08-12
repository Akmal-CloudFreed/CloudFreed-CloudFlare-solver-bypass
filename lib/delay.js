/**
 * Introduce a delay.
 * @param {number} milliseconds - The duration of the delay in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
const delay = async (milliseconds) => await new Promise(resolve => setTimeout(resolve, milliseconds));

export default delay