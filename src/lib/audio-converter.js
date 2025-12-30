/**
 * Audio conversion utility
 * Converts audio files to 16kHz WAV format and base64 encodes them
 */

import AV from 'av';
import encodeWav from 'wav-encoder';
import { createRequire } from 'module';

// Load MP3 codec for av library
// This registers the MP3 demuxer and decoder with Aurora.js
// Using createRequire because mp3 package uses CommonJS
const require = createRequire(import.meta.url);
require('mp3');

// Register codecs for av
// Note: av requires codecs to be registered separately
// We'll handle MP3 and WAV formats
// The av library will automatically detect and use available codecs
// MP3 support is provided by the 'mp3' codec package
// WAV format is natively supported by av

/**
 * Resample audio samples from one sample rate to another
 * Uses linear interpolation for resampling
 * @param {Float32Array} samples - Input audio samples
 * @param {number} sourceSampleRate - Source sample rate in Hz
 * @param {number} targetSampleRate - Target sample rate in Hz (16kHz)
 * @returns {Float32Array} Resampled audio samples
 */
function resampleAudio(samples, sourceSampleRate, targetSampleRate) {
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const t = srcIndex - srcIndexFloor;

    // Linear interpolation
    result[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t;
  }

  return result;
}

/**
 * Decode audio buffer to PCM samples
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} contentType - MIME type of audio file
 * @returns {Promise<{samples: Float32Array, sampleRate: number, channels: number}>}
 */
function decodeAudio(audioBuffer, contentType) {
  return new Promise((resolve, reject) => {
    const asset = AV.Asset.fromBuffer(audioBuffer);

    if (!asset) {
      reject(new Error('Failed to create audio asset: asset is null or undefined'));
      return;
    }

    asset.on('error', (error) => {
      // Handle both Error objects and string errors
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : String(error));
      reject(new Error(`Failed to decode audio: ${errorMessage || 'Unknown error'}`));
    });

    if (typeof asset.decodeToBuffer !== 'function') {
      reject(new Error('decodeToBuffer is not a function on asset object'));
      return;
    }

    asset.decodeToBuffer((buffer) => {
      if (!buffer) {
        reject(new Error('Decoded buffer is null or undefined'));
        return;
      }

      // Get audio format information
      const format = asset.format;
      
      if (!format) {
        reject(new Error('Asset format is null or undefined'));
        return;
      }
      
      const sampleRate = format.sampleRate;
      const channels = format.channelsPerFrame;
      
      // Convert buffer to Float32Array
      // The buffer from av decodeToBuffer can be Float32Array or Int16 PCM
      let samples;
      if (buffer instanceof Float32Array) {
        // Already Float32Array, use directly
        samples = buffer;
      } else if (buffer instanceof Int16Array || (buffer.buffer && buffer instanceof ArrayBuffer)) {
        // Int16 PCM, convert to Float32Array
        const int16Buffer = buffer instanceof Int16Array 
          ? buffer 
          : new Int16Array(buffer.buffer, buffer.byteOffset || 0, buffer.length / 2);
        samples = new Float32Array(int16Buffer.length);
        
        // Normalize Int16 to Float32 (-1.0 to 1.0)
        for (let i = 0; i < samples.length; i++) {
          samples[i] = int16Buffer[i] / 32768.0;
        }
      } else if (Buffer.isBuffer(buffer)) {
        // Node.js Buffer, treat as Int16 PCM
        const int16Buffer = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        samples = new Float32Array(int16Buffer.length);
        
        // Normalize Int16 to Float32 (-1.0 to 1.0)
        for (let i = 0; i < samples.length; i++) {
          samples[i] = int16Buffer[i] / 32768.0;
        }
      } else {
        // Try to convert to Float32Array directly
        samples = new Float32Array(buffer);
      }

      resolve({
        samples,
        sampleRate,
        channels,
      });
    });
  });
}

/**
 * Convert audio buffer to 16kHz WAV format and base64 encode
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} contentType - MIME type of audio file (e.g., 'audio/mpeg', 'audio/wav')
 * @returns {Promise<string>} Base64-encoded 16kHz WAV audio string
 */
export async function convertTo16kHzWav(audioBuffer, contentType) {
  try {
    // Decode audio to PCM samples
    const { samples, sampleRate, channels } = await decodeAudio(audioBuffer, contentType);

    // Resample to 16kHz if needed
    const targetSampleRate = 16000;
    let resampledSamples = samples;
    
    if (sampleRate !== targetSampleRate) {
      // Handle multi-channel audio by processing each channel separately
      if (channels > 1) {
        // For stereo, we'll convert to mono by averaging channels
        const monoLength = samples.length / channels;
        const mono = new Float32Array(monoLength);
        
        for (let i = 0; i < monoLength; i++) {
          let sum = 0;
          for (let ch = 0; ch < channels; ch++) {
            sum += samples[i * channels + ch];
          }
          mono[i] = sum / channels;
        }
        
        resampledSamples = resampleAudio(mono, sampleRate, targetSampleRate);
      } else {
        resampledSamples = resampleAudio(samples, sampleRate, targetSampleRate);
      }
    } else if (channels > 1) {
      // Same sample rate but multiple channels - convert to mono
      const monoLength = samples.length / channels;
      const mono = new Float32Array(monoLength);
      
      for (let i = 0; i < monoLength; i++) {
        let sum = 0;
        for (let ch = 0; ch < channels; ch++) {
          sum += samples[i * channels + ch];
        }
        mono[i] = sum / channels;
      }
      
      resampledSamples = mono;
    }

    // Encode to WAV format
    const audioData = {
      sampleRate: targetSampleRate,
      channelData: [resampledSamples], // wav-encoder expects array of channel data
    };

    const wavBuffer = await encodeWav.encode(audioData);

    // Convert to base64
    // wav-encoder returns a Uint8Array, need to convert to Buffer first
    const buffer = Buffer.isBuffer(wavBuffer) ? wavBuffer : Buffer.from(wavBuffer);
    const base64Audio = buffer.toString('base64');

    return base64Audio;
  } catch (error) {
    throw new Error(`Audio conversion failed: ${error.message}`);
  }
}

