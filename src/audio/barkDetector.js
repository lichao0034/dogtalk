/**
 * Bark detector - identifies dog bark segments from the audio stream.
 * Uses energy thresholds and frequency range to distinguish barks from noise.
 */

import { BARK_DETECTION } from '../constants/emotions';
import { calculateRMS, findDominantFrequency, normalizeByteFrequencyData } from './audioUtils';

/**
 * BarkDetector class - detects and segments individual dog barks from a continuous audio stream.
 */
export class BarkDetector {
  /**
   * @param {number} sampleRate - Audio sample rate in Hz.
   * @param {number} fftSize - FFT size used for analysis.
   */
  constructor(sampleRate, fftSize) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;

    // Bark detection state
    this.isBarking = false;
    this.barkStartTime = 0;
    this.barkEndTime = 0;
    this.currentBarkEnergy = 0;
    this.currentBarkFrequency = 0;
    this.silenceDuration = 0;

    // Bark history for pattern analysis
    this.barkTimestamps = [];
    this.barkIntervals = [];
    this.barkFeatures = [];

    // Frequency history for pitch analysis within a bark
    this.frequencyHistory = [];

    // Thresholds
    this.energyThreshold = BARK_DETECTION.ENERGY_THRESHOLD;
    this.minFrequency = BARK_DETECTION.MIN_FREQUENCY;
    this.maxFrequency = BARK_DETECTION.MAX_FREQUENCY;
    this.barkGapThreshold = BARK_DETECTION.BARK_GAP_THRESHOLD;
  }

  /**
   * Process a single audio frame and detect bark events.
   * @param {Uint8Array} byteFrequencyData - Raw frequency data from AnalyserNode.
   * @param {Float32Array} timeDomainData - Time domain data from AnalyserNode.
   * @param {number} currentTime - Current audio context time in seconds.
   * @returns {Object|null} Bark event if a bark segment just completed, null otherwise.
   */
  processFrame(byteFrequencyData, timeDomainData, currentTime) {
    const frequencyData = normalizeByteFrequencyData(byteFrequencyData);
    const rms = calculateRMS(timeDomainData);
    const dominantFreq = findDominantFrequency(
      frequencyData,
      this.sampleRate,
      this.fftSize,
      this.minFrequency,
      this.maxFrequency
    );

    const isInBarkFrequencyRange = dominantFreq >= this.minFrequency && dominantFreq <= this.maxFrequency;
    const isAboveEnergyThreshold = rms >= this.energyThreshold;
    const isPossibleBark = isAboveEnergyThreshold && isInBarkFrequencyRange;

    let completedBark = null;

    if (isPossibleBark) {
      if (!this.isBarking) {
        // Start of a new bark
        this.isBarking = true;
        this.barkStartTime = currentTime;
        this.currentBarkEnergy = rms;
        this.currentBarkFrequency = dominantFreq;
        this.frequencyHistory = [dominantFreq];
      } else {
        // Continuation of current bark - update running averages
        this.barkEndTime = currentTime;
        this.currentBarkEnergy = Math.max(this.currentBarkEnergy, rms);
        this.frequencyHistory.push(dominantFreq);
        // Keep frequency history manageable
        if (this.frequencyHistory.length > 50) {
          this.frequencyHistory = this.frequencyHistory.slice(-30);
        }
      }
      this.silenceDuration = 0;
    } else {
      if (this.isBarking) {
        this.silenceDuration += this._getFrameDuration();
        this.barkEndTime = currentTime;

        if (this.silenceDuration >= this.barkGapThreshold) {
          // Bark segment ended
          const barkDuration = this.barkEndTime - this.barkStartTime;
          if (barkDuration >= BARK_DETECTION.MIN_BARK_DURATION) {
            completedBark = this._finalizeBark(barkDuration);
          }
          this.isBarking = false;
          this.silenceDuration = 0;
        }
      }
    }

    return completedBark;
  }

  /**
   * Finalize a detected bark segment and compute its features.
   * @param {number} duration - Duration of the bark in seconds.
   * @returns {Object} Completed bark feature object.
   */
  _finalizeBark(duration) {
    const now = Date.now();

    // Calculate average frequency for this bark
    const avgFrequency = this.frequencyHistory.length > 0
      ? this.frequencyHistory.reduce((a, b) => a + b, 0) / this.frequencyHistory.length
      : this.currentBarkFrequency;

    const barkFeature = {
      timestamp: now,
      startTime: this.barkStartTime,
      endTime: this.barkEndTime,
      duration: duration,
      dominantFrequency: avgFrequency,
      peakEnergy: this.currentBarkEnergy,
      frequencyHistory: [...this.frequencyHistory],
    };

    // Update bark timestamps and intervals
    if (this.barkTimestamps.length > 0) {
      const lastBarkTime = this.barkTimestamps[this.barkTimestamps.length - 1];
      const interval = (now - lastBarkTime) / 1000; // seconds
      this.barkIntervals.push(interval);
    }
    this.barkTimestamps.push(now);
    this.barkFeatures.push(barkFeature);

    // Keep only recent barks (last 30 seconds)
    const cutoff = now - 30000;
    while (this.barkTimestamps.length > 0 && this.barkTimestamps[0] < cutoff) {
      this.barkTimestamps.shift();
      this.barkFeatures.shift();
      if (this.barkIntervals.length > 0) {
        this.barkIntervals.shift();
      }
    }

    return barkFeature;
  }

  /**
   * Get approximate frame duration based on FFT size and sample rate.
   * @returns {number} Frame duration in seconds.
   */
  _getFrameDuration() {
    return this.fftSize / this.sampleRate;
  }

  /**
   * Get the current bark pattern features for emotion classification.
   * @returns {Object} Aggregated features for the recent bark pattern.
   */
  getPatternFeatures() {
    const recentBarks = this.barkFeatures.slice(-10);
    if (recentBarks.length === 0) {
      return {
        barkCount: 0,
        avgBarkInterval: 0,
        regularityScore: 0,
        avgFrequency: 0,
        avgDuration: 0,
        avgEnergy: 0,
        totalDuration: 0,
      };
    }

    const barkCount = recentBarks.length;
    const avgFrequency = recentBarks.reduce((s, b) => s + b.dominantFrequency, 0) / barkCount;
    const avgDuration = recentBarks.reduce((s, b) => s + b.duration, 0) / barkCount;
    const avgEnergy = recentBarks.reduce((s, b) => s + b.peakEnergy, 0) / barkCount;
    const totalDuration = recentBarks.reduce((s, b) => s + b.duration, 0);

    const avgBarkInterval = this.barkIntervals.length > 0
      ? this.barkIntervals.reduce((a, b) => a + b, 0) / this.barkIntervals.length
      : 0;

    // Calculate regularity
    let regularityScore = 0;
    if (this.barkIntervals.length >= 2) {
      const mean = this.barkIntervals.reduce((a, b) => a + b, 0) / this.barkIntervals.length;
      if (mean > 0) {
        const variance = this.barkIntervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / this.barkIntervals.length;
        const cv = Math.sqrt(variance) / mean;
        regularityScore = Math.max(0, 1 - cv);
      }
    }

    return {
      barkCount,
      avgBarkInterval,
      regularityScore,
      avgFrequency,
      avgDuration,
      avgEnergy,
      totalDuration,
    };
  }

  /**
   * Reset the detector state.
   */
  reset() {
    this.isBarking = false;
    this.barkStartTime = 0;
    this.barkEndTime = 0;
    this.currentBarkEnergy = 0;
    this.currentBarkFrequency = 0;
    this.silenceDuration = 0;
    this.barkTimestamps = [];
    this.barkIntervals = [];
    this.barkFeatures = [];
    this.frequencyHistory = [];
  }
}

export default BarkDetector;
