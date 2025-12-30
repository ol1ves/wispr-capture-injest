/**
 * Cleanup service
 * Deletes audio artifacts immediately after transcription
 */

/**
 * Clean up audio buffer
 * @param {Buffer} audioBuffer - Audio buffer to clean up
 * @returns {void}
 */
export function cleanupAudio(audioBuffer) {
  if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
    // Clear buffer contents
    audioBuffer.fill(0);
  }
  
  // Note: In Node.js, buffers are garbage collected automatically
  // Setting to null helps GC, but explicit fill(0) ensures data is cleared
  // Log cleanup for monitoring (without sensitive data)
  console.log('Audio buffer cleaned up');
}

/**
 * Clean up file object from multer
 * @param {Object} file - Multer file object
 * @returns {void}
 */
export function cleanupFile(file) {
  if (file && file.buffer) {
    cleanupAudio(file.buffer);
  }
  
  // Clear file reference
  if (file) {
    file.buffer = null;
  }
}

