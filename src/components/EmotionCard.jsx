/**
 * EmotionCard - displays the current detected emotion with icon, name, and confidence.
 * Includes a large emoji display and confidence bar.
 */

import React from 'react';
import { Box, Typography, LinearProgress, Card } from '@mui/material';
import { EMOTIONS } from '../constants/emotions';

/**
 * EmotionCard component.
 * @param {Object} props
 * @param {string} props.emotion - Current emotion ID.
 * @param {number} props.confidence - Confidence percentage (0-100).
 * @param {boolean} props.isBarking - Whether a bark is currently detected.
 * @param {Object} props.features - Current audio features for debug display.
 */
function EmotionCard({ emotion = 'relaxed', confidence = 0, isBarking = false, features = null }) {
  const emotionKey = emotion.toUpperCase();
  const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;

  return (
    <Card
      elevation={0}
      sx={{
        mx: 2,
        my: 1.5,
        p: 2,
        borderRadius: 4,
        background: emotionData.bgColor,
        border: `2px solid ${emotionData.color}30`,
        transition: 'all 0.5s ease',
        textAlign: 'center',
      }}
    >
      {/* Emotion Emoji */}
      <Box
        sx={{
          fontSize: '4rem',
          lineHeight: 1,
          mb: 1,
          transition: 'transform 0.3s ease',
          transform: isBarking ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        {emotionData.emoji}
      </Box>

      {/* Emotion Name */}
      <Typography
        variant="h6"
        sx={{
          color: emotionData.color,
          fontWeight: 700,
          fontSize: '1.2rem',
          mb: 0.5,
        }}
      >
        {emotionData.name}
      </Typography>

      {/* Description */}
      <Typography
        variant="body2"
        sx={{
          color: '#757575',
          fontSize: '0.8rem',
          mb: 1.5,
        }}
      >
        {emotionData.description}
      </Typography>

      {/* Confidence Bar */}
      <Box sx={{ px: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mb: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ color: '#9E9E9E', fontSize: '0.7rem' }}>
            置信度
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: emotionData.color,
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            {confidence}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={confidence}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: `${emotionData.color}15`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: `linear-gradient(90deg, ${emotionData.color}80, ${emotionData.color})`,
            },
          }}
        />
      </Box>

      {/* Feature indicators (subtle) */}
      {features && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mt: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <FeatureChip label="频率" value={`${Math.round(features.dominantFrequency)}Hz`} />
          <FeatureChip label="能量" value={`${Math.round(features.energy * 100)}%`} />
          <FeatureChip label="音高波动" value={`${Math.round(features.pitchVariation * 100)}%`} />
        </Box>
      )}
    </Card>
  );
}

/**
 * Small feature indicator chip.
 */
function FeatureChip({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#BDBDBD', fontSize: '0.6rem', lineHeight: 1 }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: '#757575', fontSize: '0.65rem', fontWeight: 600, lineHeight: 1.4 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default EmotionCard;
