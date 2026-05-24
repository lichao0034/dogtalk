/**
 * Audio utility functions for signal processing.
 * Provides FFT, frequency conversion, RMS calculation, and other helpers.
 */

/**
 * Convert FFT bin index to frequency in Hz.
 * @param {number} binIndex - The FFT bin index.
 * @param {number} sampleRate - The audio sample rate in Hz.
 * @param {number} fftSize - The FFT size.
 * @returns {number} Frequency in Hz.
 */
export function binToFrequency(binIndex, sampleRate, fftSize) {
  return (binIndex * sampleRate) / fftSize;
}

/**
 * Convert frequency in Hz to the nearest FFT bin index.
 * @param {number} frequency - Frequency in Hz.
 * @param {number} sampleRate - The audio sample rate in Hz.
 * @param {number} fftSize - The FFT size.
 * @returns {number} The nearest FFT bin index.
 */
export function frequencyToBin(frequency, sampleRate, fftSize) {
  return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Calculate RMS (Root Mean Square) energy of a signal.
 * @param {Float32Array} timeDomainData - The time domain audio data.
 * @returns {number} RMS value (0-1 normalized approximately).
 */
export function calculateRMS(timeDomainData) {
  let sum = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    const sample = timeDomainData[i];
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / timeDomainData.length);
  return rms;
}

/**
 * Calculate the spectral centroid (brightness/timbre measure).
 * @param {Float32Array} frequencyData - The frequency domain data from AnalyserNode.
 * @param {number} sampleRate - The audio sample rate.
 * @param {number} fftSize - The FFT size.
 * @returns {number} Spectral centroid in Hz.
 */
export function calculateSpectralCentroid(frequencyData, sampleRate, fftSize) {
  let weightedSum = 0;
  let magnitudeSum = 0;
  const binCount = frequencyData.length;

  for (let i = 0; i < binCount; i++) {
    const magnitude = frequencyData[i];
    const frequency = binToFrequency(i, sampleRate, fftSize);
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) {
    return 0;
  }

  return weightedSum / magnitudeSum;
}

/**
 * Find the dominant frequency using peak detection in frequency domain.
 * @param {Float32Array} frequencyData - The frequency domain data.
 * @param {number} sampleRate - The audio sample rate.
 * @param {number} fftSize - The FFT size.
 * @param {number} minFreq - Minimum frequency to consider (Hz).
 * @param {number} maxFreq - Maximum frequency to consider (Hz).
 * @returns {number} Dominant frequency in Hz.
 */
export function findDominantFrequency(frequencyData, sampleRate, fftSize, minFreq = 100, maxFreq = 4000) {
  const minBin = frequencyToBin(minFreq, sampleRate, fftSize);
  const maxBin = Math.min(frequencyToBin(maxFreq, sampleRate, fftSize), frequencyData.length - 1);

  let maxMagnitude = 0;
  let peakBin = minBin;

  for (let i = minBin; i <= maxBin; i++) {
    if (frequencyData[i] > maxMagnitude) {
      maxMagnitude = frequencyData[i];
      peakBin = i;
    }
  }

  return binToFrequency(peakBin, sampleRate, fftSize);
}

/**
 * Calculate pitch variation (standard deviation of frequency over time).
 * @param {number[]} frequencyHistory - Array of recent dominant frequencies.
 * @returns {number} Normalized pitch variation (0-1).
 */
export function calculatePitchVariation(frequencyHistory) {
  if (frequencyHistory.length < 2) {
    return 0;
  }

  const mean = frequencyHistory.reduce((a, b) => a + b, 0) / frequencyHistory.length;
  const variance = frequencyHistory.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencyHistory.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: typical dog bark frequency std dev ranges 0-300Hz
  // We map to 0-1 range
  return Math.min(stdDev / 300, 1.0);
}

/**
 * Calculate pitch slope (linear regression of frequency over time).
 * Positive = rising pitch, negative = falling pitch.
 * @param {number[]} frequencyHistory - Array of recent dominant frequencies.
 * @returns {number} Slope in Hz per sample.
 */
export function calculatePitchSlope(frequencyHistory) {
  if (frequencyHistory.length < 3) {
    return 0;
  }

  const n = frequencyHistory.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += frequencyHistory[i];
    sumXY += i * frequencyHistory[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculate regularity of bark intervals.
 * Regular barking (hungry/attention) has consistent intervals.
 * @param {number[]} barkIntervals - Array of intervals between barks in seconds.
 * @returns {number} Regularity score (0-1, 1 = perfectly regular).
 */
export function calculateRegularity(barkIntervals) {
  if (barkIntervals.length < 2) {
    return 0;
  }

  const mean = barkIntervals.reduce((a, b) => a + b, 0) / barkIntervals.length;
  if (mean === 0) {
    return 0;
  }

  const variance = barkIntervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / barkIntervals.length;
  const cv = Math.sqrt(variance) / mean; // Coefficient of variation

  // CV < 0.2 is very regular, CV > 0.8 is irregular
  // Map to 0-1 score
  return Math.max(0, 1 - cv);
}

/**
 * Smooth a value using exponential moving average.
 * @param {number} previous - Previous smoothed value.
 * @param {number} current - Current raw value.
 * @param {number} alpha - Smoothing factor (0-1, higher = less smooth).
 * @returns {number} Smoothed value.
 */
export function exponentialSmooth(previous, current, alpha = 0.3) {
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Convert byte frequency data (0-255) to normalized values (0-1).
 * @param {Uint8Array} byteData - Byte frequency data from AnalyserNode.
 * @returns {Float32Array} Normalized frequency data.
 */
export function normalizeByteFrequencyData(byteData) {
  const normalized = new Float32Array(byteData.length);
  for (let i = 0; i < byteData.length; i++) {
    normalized[i] = byteData[i] / 255;
  }
  return normalized;
}

/**
 * Calculate average energy in a specific frequency band.
 * @param {Float32Array} frequencyData - Normalized frequency data.
 * @param {number} startBin - Start bin index.
 * @param {number} endBin - End bin index.
 * @returns {number} Average energy in the band (0-1).
 */
export function bandEnergy(frequencyData, startBin, endBin) {
  if (startBin >= endBin || endBin > frequencyData.length) {
    return 0;
  }
  let sum = 0;
  for (let i = startBin; i < endBin; i++) {
    sum += frequencyData[i];
  }
  return sum / (endBin - startBin);
}
