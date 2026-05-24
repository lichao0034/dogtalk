/**
 * Emotion definitions and rule configuration for dog bark emotion classification.
 * Each emotion has: id, name, icon, color, description, and rule thresholds.
 */

export const EMOTIONS = {
  HAPPY: {
    id: 'happy',
    name: '开心/兴奋',
    icon: '🟢',
    emoji: '😄',
    color: '#4CAF50',
    bgColor: 'rgba(76, 175, 80, 0.1)',
    lightColor: '#E8F5E9',
    description: '狗狗很开心，尾巴摇得飞快！',
  },
  ALERT: {
    id: 'alert',
    name: '警惕/警告',
    icon: '🔴',
    emoji: '⚠️',
    color: '#F44336',
    bgColor: 'rgba(244, 67, 54, 0.1)',
    lightColor: '#FFEBEE',
    description: '狗狗在警告什么，注意周围环境！',
  },
  ANXIOUS: {
    id: 'anxious',
    name: '焦虑/不安',
    icon: '🟡',
    emoji: '😰',
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.1)',
    lightColor: '#FFF3E0',
    description: '狗狗感到不安，需要安抚。',
  },
  LONELY: {
    id: 'lonely',
    name: '孤独/求关注',
    icon: '🔵',
    emoji: '🥺',
    color: '#2196F3',
    bgColor: 'rgba(33, 150, 243, 0.1)',
    lightColor: '#E3F2FD',
    description: '狗狗在呼唤你，快去陪陪它！',
  },
  HUNGRY: {
    id: 'hungry',
    name: '饥饿/需求',
    icon: '🟠',
    emoji: '🍖',
    color: '#FF5722',
    bgColor: 'rgba(255, 87, 34, 0.1)',
    lightColor: '#FBE9E7',
    description: '狗狗可能饿了或有其他需求。',
  },
  RELAXED: {
    id: 'relaxed',
    name: '放松/满足',
    icon: '⚪',
    emoji: '😌',
    color: '#9E9E9E',
    bgColor: 'rgba(158, 158, 158, 0.1)',
    lightColor: '#F5F5F5',
    description: '狗狗很放松，一切安好。',
  },
};

/**
 * Emotion classification rules.
 * Each rule is a function that takes audio features and returns a score (0-1).
 * The emotion with the highest weighted score wins.
 */
export const EMOTION_RULES = {
  happy: {
    weight: 1.0,
    evaluate: (features) => {
      let score = 0;
      // High frequency (500-2000Hz)
      if (features.dominantFrequency > 500 && features.dominantFrequency < 2000) {
        score += 0.3;
      }
      // Short duration (< 0.5s)
      if (features.duration < 0.5) {
        score += 0.25;
      }
      // High pitch variation
      if (features.pitchVariation > 0.3) {
        score += 0.25;
      }
      // Multiple rapid barks
      if (features.barkCount >= 3 && features.avgBarkInterval < 0.8) {
        score += 0.2;
      }
      return score;
    },
  },
  alert: {
    weight: 1.0,
    evaluate: (features) => {
      let score = 0;
      // Low frequency (200-600Hz)
      if (features.dominantFrequency >= 200 && features.dominantFrequency < 600) {
        score += 0.3;
      }
      // Sustained duration (> 0.5s)
      if (features.duration > 0.5) {
        score += 0.2;
      }
      // High energy/RMS
      if (features.energy > 0.6) {
        score += 0.25;
      }
      // Stable pitch (low variation)
      if (features.pitchVariation < 0.15) {
        score += 0.25;
      }
      return score;
    },
  },
  anxious: {
    weight: 1.0,
    evaluate: (features) => {
      let score = 0;
      // Medium frequency (400-800Hz)
      if (features.dominantFrequency >= 400 && features.dominantFrequency < 800) {
        score += 0.25;
      }
      // Long duration (> 0.6s)
      if (features.duration > 0.6) {
        score += 0.25;
      }
      // High pitch variation
      if (features.pitchVariation > 0.25) {
        score += 0.3;
      }
      // Medium-high energy
      if (features.energy > 0.3 && features.energy < 0.7) {
        score += 0.2;
      }
      return score;
    },
  },
  lonely: {
    weight: 1.0,
    evaluate: (features) => {
      let score = 0;
      // Medium frequency (300-700Hz)
      if (features.dominantFrequency >= 300 && features.dominantFrequency < 700) {
        score += 0.25;
      }
      // Very long duration / howling (> 1s)
      if (features.duration > 1.0) {
        score += 0.3;
      }
      // Gradual pitch change
      if (features.pitchSlope !== 0 && Math.abs(features.pitchSlope) > 0.1) {
        score += 0.25;
      }
      // Low bark count
      if (features.barkCount <= 2) {
        score += 0.2;
      }
      return score;
    },
  },
  hungry: {
    weight: 1.0,
    evaluate: (features) => {
      let score = 0;
      // Medium-high frequency (500-1000Hz)
      if (features.dominantFrequency >= 500 && features.dominantFrequency < 1000) {
        score += 0.25;
      }
      // Regular repeated pattern
      if (features.barkCount >= 2 && features.regularityScore > 0.6) {
        score += 0.3;
      }
      // Medium duration
      if (features.duration > 0.2 && features.duration < 0.6) {
        score += 0.25;
      }
      // Medium energy
      if (features.energy > 0.3 && features.energy < 0.7) {
        score += 0.2;
      }
      return score;
    },
  },
  relaxed: {
    weight: 0.8,
    evaluate: (features) => {
      let score = 0;
      // Low frequency (< 400Hz)
      if (features.dominantFrequency < 400) {
        score += 0.25;
      }
      // Low energy
      if (features.energy < 0.3) {
        score += 0.3;
      }
      // Intermittent (low bark count)
      if (features.barkCount <= 1) {
        score += 0.25;
      }
      // Short duration
      if (features.duration < 0.3) {
        score += 0.2;
      }
      return score;
    },
  },
};

/**
 * Bark detection thresholds.
 */
export const BARK_DETECTION = {
  /** Minimum RMS energy to consider as sound (0-1 normalized) */
  ENERGY_THRESHOLD: 0.08,
  /** Minimum frequency for dog bark (Hz) */
  MIN_FREQUENCY: 150,
  /** Maximum frequency for dog bark (Hz) */
  MAX_FREQUENCY: 3000,
  /** Minimum duration of a bark segment (seconds) */
  MIN_BARK_DURATION: 0.05,
  /** Maximum duration of a single bark (seconds) */
  MAX_BARK_DURATION: 3.0,
  /** Silence gap threshold to separate barks (seconds) */
  BARK_GAP_THRESHOLD: 0.3,
  /** FFT size for frequency analysis */
  FFT_SIZE: 2048,
  /** Smoothing time constant for analyser */
  SMOOTHING_TIME_CONSTANT: 0.8,
};

/**
 * State machine configuration for emotion smoothing.
 * Prevents rapid flickering between emotions.
 */
export const STATE_MACHINE = {
  /** Minimum time before emotion can change (ms) */
  MIN_EMOTION_DURATION: 1500,
  /** Confidence boost for current emotion to resist change */
  PERSISTENCE_BONUS: 0.1,
  /** Minimum confidence difference to trigger emotion change */
  CHANGE_THRESHOLD: 0.05,
};

export default EMOTIONS;
