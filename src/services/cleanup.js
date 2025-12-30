/**
 * Cleanup service
 * Deletes audio artifacts immediately after transcription
 */

/**
 * Clean up file object from multer
 * Clears audio buffer contents and removes file reference
 * @param {Object} file - Multer file object
 * @returns {void}
 */
export function cleanupFile(file) {
  if (file?.buffer && Buffer.isBuffer(file.buffer)) {
    // Clear buffer contents to ensure data is cleared
    file.buffer.fill(0);
  }
  
  // Clear file reference
  if (file) {
    file.buffer = null;
  }
}

