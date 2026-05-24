/**
 * Emotion Classifier - rule-based emotion classification engine.
 * Uses weighted rule scoring to determine dog emotion from audio features.
 * Includes a simple state machine for smoothing emotion transitions.
 */

import { EMOTIONS, EMOTION_RULES, STATE_MACHINE } from '../constants/emotions';

/**
 * State machine for smoothing emotion transitions.
 * Prevents rapid flickering between emotions by requiring
 * a minimum duration and confidence difference before switching.
 */
class EmotionStateMachine {
  constructor() {
    /** @type {string|null} Current emotion ID */
    this.currentEmotion = null;
    /** @type {number} Current confidence (0-1) */
    this.currentConfidence = 0;
    /** @type {number} Timestamp when current emotion was set */
    this.emotionStartTime = 0;
    /** @type {Object} Score history for each emotion */
    this.scoreHistory = {};
  }

  /**
   * Process a new emotion classification and apply smoothing.
   * @param {string} rawEmotion - The raw classified emotion ID.
   * @param {number} rawConfidence - The raw confidence (0-1).
   * @param {number} timestamp - Current timestamp in ms.
   * @returns {{emotion: string, confidence: number}} Smoothed emotion result.
   */
  process(rawEmotion, rawConfidence, timestamp = Date.now()) {
    // If no current emotion, accept the new one
    if (this.currentEmotion === null) {
      this.currentEmotion = rawEmotion;
      this.currentConfidence = rawConfidence;
      this.emotionStartTime = timestamp;
      return { emotion: rawEmotion, confidence: rawConfidence };
    }

    // Check minimum duration constraint
    const elapsed = timestamp - this.emotionStartTime;
    const minDuration = STATE_MACHINE.MIN_EMOTION_DURATION;

    if (elapsed < minDuration) {
      // Still within minimum duration - apply persistence bonus
      if (rawEmotion === this.currentEmotion) {
        // Same emotion - update confidence with slight boost
        this.currentConfidence = Math.min(1, rawConfidence + STATE_MACHINE.PERSISTENCE_BONUS * 0.5);
        return { emotion: this.currentEmotion, confidence: this.currentConfidence };
      } else {
        // Different emotion - only switch if significantly more confident
        const effectiveConfidence = rawConfidence - STATE_MACHINE.CHANGE_THRESHOLD;
        if (effectiveConfidence > this.currentConfidence + STATE_MACHINE.PERSISTENCE_BONUS) {
          this.currentEmotion = rawEmotion;
          this.currentConfidence = rawConfidence;
          this.emotionStartTime = timestamp;
          return { emotion: rawEmotion, confidence: rawConfidence };
        }
        // Keep current emotion with persistence
        return { emotion: this.currentEmotion, confidence: this.currentConfidence };
      }
    }

    // Minimum duration passed - allow normal transitions
    if (rawEmotion === this.currentEmotion) {
      this.currentConfidence = rawConfidence;
      return { emotion: this.currentEmotion, confidence: this.currentConfidence };
    }

    // New emotion - check if confidence justifies the switch
    if (rawConfidence > this.currentConfidence - STATE_MACHINE.PERSISTENCE_BONUS) {
      this.currentEmotion = rawEmotion;
      this.currentConfidence = rawConfidence;
      this.emotionStartTime = timestamp;
      return { emotion: rawEmotion, confidence: rawConfidence };
    }

    return { emotion: this.currentEmotion, confidence: this.currentConfidence };
  }

  /**
   * Reset the state machine.
   */
  reset() {
    this.currentEmotion = null;
    this.currentConfidence = 0;
    this.emotionStartTime = 0;
    this.scoreHistory = {};
  }
}

// Singleton state machine instance
const stateMachine = new EmotionStateMachine();

/**
 * Classify emotion from audio features using rule-based scoring.
 * @param {Object} features - Audio features object.
 * @param {number} features.dominantFrequency - Dominant frequency in Hz.
 * @param {number} features.energy - RMS energy (0-1).
 * @param {number} features.spectralCentroid - Spectral centroid in Hz.
 * @param {number} features.pitchVariation - Pitch variation (0-1).
 * @param {number} features.pitchSlope - Pitch slope (Hz/sample).
 * @param {number} features.duration - Average bark duration in seconds.
 * @param {number} features.barkCount - Number of barks detected.
 * @param {number} features.avgBarkInterval - Average interval between barks in seconds.
 * @param {number} features.regularityScore - Regularity of bark pattern (0-1).
 * @param {boolean} applySmoothing - Whether to apply state machine smoothing.
 * @returns {{emotion: string, emotionData: Object, confidence: number, scores: Object}} Classification result.
 */
export function classifyEmotion(features, applySmoothing = true) {
  const scores = {};

  // Evaluate each emotion rule
  for (const [emotionId, rule] of Object.entries(EMOTION_RULES)) {
    const rawScore = rule.evaluate(features);
    scores[emotionId] = rawScore * rule.weight;
  }

  // Find the emotion with the highest score
  let bestEmotion = 'relaxed'; // Default
  let bestScore = 0;

  for (const [emotionId, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotionId;
    }
  }

  // Calculate confidence as ratio of best score to total
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;

  // Apply state machine smoothing
  let finalEmotion = bestEmotion;
  let finalConfidence = confidence;

  if (applySmoothing) {
    const smoothed = stateMachine.process(bestEmotion, confidence);
    finalEmotion = smoothed.emotion;
    finalConfidence = smoothed.confidence;
  }

  // Get emotion metadata
  const emotionKey = finalEmotion.toUpperCase();
  const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;

  return {
    emotion: finalEmotion,
    emotionData,
    confidence: Math.min(Math.round(finalConfidence * 100), 100),
    scores,
  };
}

/**
 * Reset the emotion classifier state.
 */
export function resetClassifier() {
  stateMachine.reset();
}

/**
 * Get the current emotion state without reclassifying.
 * @returns {{emotion: string|null, confidence: number}} Current state.
 */
export function getCurrentState() {
  return {
    emotion: stateMachine.currentEmotion,
    confidence: stateMachine.currentConfidence,
  };
}

export default classifyEmotion;
