/**
 * Audio Analyzer - extracts audio features from the microphone stream
 * using Web Audio API's AnalyserNode.
 */

import { BARK_DETECTION } from '../constants/emotions';
import {
  calculateRMS,
  findDominantFrequency,
  calculateSpectralCentroid,
  calculatePitchVariation,
  calculatePitchSlope,
  normalizeByteFrequencyData,
  exponentialSmooth,
} from './audioUtils';
import { BarkDetector } from './barkDetector';
import { classifyEmotion } from './emotionClassifier';

/**
 * AudioAnalyzer class - manages audio capture and real-time feature extraction.
 */
export class AudioAnalyzer {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioContext = null;
    /** @type {AnalyserNode|null} */
    this.analyser = null;
    /** @type {MediaStreamAudioSourceNode|null} */
    this.sourceNode = null;
    /** @type {MediaStream|null} */
    this.mediaStream = null;
    /** @type {ScriptProcessorNode|null} */
    this.processorNode = null;

    this.isListening = false;
    this.fftSize = BARK_DETECTION.FFT_SIZE;

    // Buffers for analyser data
    this.frequencyData = null;
    this.timeDomainData = null;

    // Smoothed feature values
    this.smoothedFeatures = {
      dominantFrequency: 0,
      energy: 0,
      spectralCentroid: 0,
    };

    // Frequency tracking for pitch analysis
    this.recentFrequencies = [];
    this.maxFrequencyHistory = 20;

    // Bark detector instance
    this.barkDetector = null;

    // Callbacks
    this.onFeaturesUpdate = null;
    this.onBarkDetected = null;
    this.onWaveformData = null;

    // Animation frame
    this.animationFrameId = null;
  }

  /**
   * Initialize the audio analyzer and start listening.
   * @returns {Promise<boolean>} Whether initialization was successful.
   */
  async start() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = this.audioContext.sampleRate;

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = BARK_DETECTION.SMOOTHING_TIME_CONSTANT;

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      // Initialize data buffers
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Float32Array(this.analyser.fftSize);

      // Initialize bark detector
      this.barkDetector = new BarkDetector(sampleRate, this.fftSize);

      // Start processing loop
      this.isListening = true;
      this._processLoop();

      return true;
    } catch (error) {
      console.error('Failed to start audio analyzer:', error);
      this.stop();
      return false;
    }
  }

  /**
   * Stop audio analysis and release resources.
   */
  stop() {
    this.isListening = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.analyser = null;
    this.barkDetector = null;
  }

  /**
   * Main processing loop using requestAnimationFrame.
   */
  _processLoop() {
    if (!this.isListening || !this.analyser) {
      return;
    }

    // Get current audio data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    const normalizedFreqData = normalizeByteFrequencyData(this.frequencyData);
    const sampleRate = this.audioContext.sampleRate;
    const currentTime = this.audioContext.currentTime;

    // Extract raw features
    const rms = calculateRMS(this.timeDomainData);
    const dominantFreq = findDominantFrequency(
      normalizedFreqData,
      sampleRate,
      this.fftSize,
      BARK_DETECTION.MIN_FREQUENCY,
      BARK_DETECTION.MAX_FREQUENCY
    );
    const spectralCentroid = calculateSpectralCentroid(
      normalizedFreqData,
      sampleRate,
      this.fftSize
    );

    // Apply smoothing
    this.smoothedFeatures.dominantFrequency = exponentialSmooth(
      this.smoothedFeatures.dominantFrequency,
      dominantFreq,
      0.4
    );
    this.smoothedFeatures.energy = exponentialSmooth(
      this.smoothedFeatures.energy,
      rms,
      0.4
    );
    this.smoothedFeatures.spectralCentroid = exponentialSmooth(
      this.smoothedFeatures.spectralCentroid,
      spectralCentroid,
      0.4
    );

    // Update frequency history
    this.recentFrequencies.push(this.smoothedFeatures.dominantFrequency);
    if (this.recentFrequencies.length > this.maxFrequencyHistory) {
      this.recentFrequencies.shift();
    }

    // Calculate derived features
    const pitchVariation = calculatePitchVariation(this.recentFrequencies);
    const pitchSlope = calculatePitchSlope(this.recentFrequencies);

    // Process through bark detector
    let barkEvent = null;
    if (this.barkDetector) {
      barkEvent = this.barkDetector.processFrame(
        this.frequencyData,
        this.timeDomainData,
        currentTime
      );
    }

    // Get pattern features from bark detector
    const patternFeatures = this.barkDetector ? this.barkDetector.getPatternFeatures() : {
      barkCount: 0,
      avgBarkInterval: 0,
      regularityScore: 0,
    };

    // Compile complete feature set
    const features = {
      dominantFrequency: this.smoothedFeatures.dominantFrequency,
      energy: this.smoothedFeatures.energy,
      spectralCentroid: this.smoothedFeatures.spectralCentroid,
      pitchVariation: pitchVariation,
      pitchSlope: pitchSlope,
      duration: patternFeatures.avgDuration,
      barkCount: patternFeatures.barkCount,
      avgBarkInterval: patternFeatures.avgBarkInterval,
      regularityScore: patternFeatures.regularityScore,
      isBarking: this.barkDetector ? this.barkDetector.isBarking : false,
      rms: rms,
    };

    // Notify callbacks
    if (this.onFeaturesUpdate) {
      this.onFeaturesUpdate(features);
    }

    if (barkEvent && this.onBarkDetected) {
      this.onBarkDetected(barkEvent);
    }

    if (this.onWaveformData) {
      this.onWaveformData(this.timeDomainData, this.frequencyData);
    }

    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => this._processLoop());
  }

  /**
   * Analyze a video/audio element for emotion detection.
   * @param {HTMLVideoElement|HTMLAudioElement} mediaElement - The media element to analyze.
   * @param {function} onProgress - Progress callback (0-1).
   * @param {function} onSegmentResult - Called with emotion result for each segment.
   * @returns {Promise<Array>} Array of segment analysis results.
   */
  async analyzeMediaElement(mediaElement, onProgress, onSegmentResult) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(mediaElement);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = this.fftSize;
    analyser.smoothingTimeConstant = BARK_DETECTION.SMOOTHING_TIME_CONSTANT;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const sampleRate = audioContext.sampleRate;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeDomainData = new Float32Array(analyser.fftSize);
    const barkDetector = new BarkDetector(sampleRate, this.fftSize);

    const segmentDuration = 2.0; // Analyze in 2-second segments
    const results = [];
    const totalDuration = mediaElement.duration;

    let recentFrequencies = [];
    const maxFreqHistory = 20;
    let smoothedFreq = 0;
    let smoothedEnergy = 0;
    let smoothedCentroid = 0;

    // Process video by playing it at accelerated speed or stepping through
    // We'll use a more practical approach: play and sample at intervals
    return new Promise((resolve) => {
      let currentTime = 0;
      let lastSegmentStart = 0;
      let segmentBarkEvents = [];
      let segmentFrequencies = [];
      let segmentEnergies = [];

      const analyzeFrame = () => {
        if (mediaElement.paused || mediaElement.ended) {
          // Process any remaining segment
          if (currentTime - lastSegmentStart > 0.5) {
            const result = this._processSegment(
              segmentBarkEvents, segmentFrequencies, segmentEnergies,
              lastSegmentStart, currentTime, sampleRate
            );
            if (result) {
              results.push(result);
              if (onSegmentResult) onSegmentResult(result);
            }
          }
          audioContext.close();
          if (onProgress) onProgress(1);
          resolve(results);
          return;
        }

        currentTime = mediaElement.currentTime;

        // Get current audio data
        analyser.getByteFrequencyData(frequencyData);
        analyser.getFloatTimeDomainData(timeDomainData);

        const normalizedFreq = normalizeByteFrequencyData(frequencyData);
        const rms = calculateRMS(timeDomainData);
        const dominantFreq = findDominantFrequency(
          normalizedFreq, sampleRate, this.fftSize,
          BARK_DETECTION.MIN_FREQUENCY, BARK_DETECTION.MAX_FREQUENCY
        );
        const centroid = calculateSpectralCentroid(normalizedFreq, sampleRate, this.fftSize);

        // Smooth values
        smoothedFreq = exponentialSmooth(smoothedFreq, dominantFreq, 0.4);
        smoothedEnergy = exponentialSmooth(smoothedEnergy, rms, 0.4);
        smoothedCentroid = exponentialSmooth(smoothedCentroid, centroid, 0.4);

        segmentFrequencies.push(smoothedFreq);
        segmentEnergies.push(smoothedEnergy);

        // Bark detection
        const barkEvent = barkDetector.processFrame(frequencyData, timeDomainData, currentTime);
        if (barkEvent) {
          segmentBarkEvents.push(barkEvent);
        }

        // Check if segment is complete
        if (currentTime - lastSegmentStart >= segmentDuration) {
          const result = this._processSegment(
            segmentBarkEvents, segmentFrequencies, segmentEnergies,
            lastSegmentStart, currentTime, sampleRate
          );
          if (result) {
            results.push(result);
            if (onSegmentResult) onSegmentResult(result);
          }
          // Reset segment data
          lastSegmentStart = currentTime;
          segmentBarkEvents = [];
          segmentFrequencies = [];
          segmentEnergies = [];
        }

        if (onProgress) {
          onProgress(Math.min(currentTime / totalDuration, 1));
        }

        requestAnimationFrame(analyzeFrame);
      };

      mediaElement.play().then(() => {
        requestAnimationFrame(analyzeFrame);
      }).catch((err) => {
        console.error('Failed to play media:', err);
        audioContext.close();
        resolve(results);
      });
    });
  }

  /**
   * Process a segment of audio data and return emotion classification.
   * @private
   */
  _processSegment(barkEvents, frequencies, energies, startTime, endTime, sampleRate) {
    if (energies.length === 0) return null;

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const maxEnergy = Math.max(...energies);

    // Skip segments with very low energy (silence)
    if (avgEnergy < BARK_DETECTION.ENERGY_THRESHOLD * 0.5) {
      return {
        startTime,
        endTime,
        emotion: 'silent',
        confidence: 0,
        features: { energy: avgEnergy },
      };
    }

    const avgFrequency = frequencies.length > 0
      ? frequencies.reduce((a, b) => a + b, 0) / frequencies.length
      : 0;
    const pitchVariation = calculatePitchVariation(frequencies);
    const pitchSlope = calculatePitchSlope(frequencies);
    const duration = endTime - startTime;

    const barkCount = barkEvents.length;
    const regularityScore = barkCount >= 2
      ? this._calculateRegularity(barkEvents)
      : 0;
    const avgBarkInterval = barkCount >= 2
      ? (endTime - startTime) / (barkCount - 1)
      : 0;

    const features = {
      dominantFrequency: avgFrequency,
      energy: maxEnergy,
      spectralCentroid: 0,
      pitchVariation,
      pitchSlope,
      duration,
      barkCount,
      avgBarkInterval,
      regularityScore,
    };

    const result = classifyEmotion(features);

    return {
      startTime,
      endTime,
      emotion: result.emotion,
      confidence: result.confidence,
      features,
    };
  }

  /**
   * Calculate regularity of bark intervals from bark events.
   * @private
   */
  _calculateRegularity(barkEvents) {
    if (barkEvents.length < 2) return 0;
    const intervals = [];
    for (let i = 1; i < barkEvents.length; i++) {
      intervals.push(barkEvents[i].startTime - barkEvents[i - 1].startTime);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return 0;
    const variance = intervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, 1 - cv);
  }
}

export default AudioAnalyzer;
