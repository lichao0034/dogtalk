/**
 * VideoTimeline - displays emotion annotations along a video timeline.
 * Each segment is color-coded by detected emotion.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { EMOTIONS } from '../constants/emotions';

/**
 * VideoTimeline component.
 * @param {Array} props.segments - Array of emotion segments.
 * @param {number} props.segments[].startTime - Segment start time in seconds.
 * @param {number} props.segments[].endTime - Segment end time in seconds.
 * @param {string} props.segments[].emotion - Emotion ID for the segment.
 * @param {number} props.segments[].confidence - Confidence percentage.
 * @param {number} props.duration - Total video duration in seconds.
 * @param {number} props.currentTime - Current playback time in seconds.
 * @param {function} props.onSeek - Callback when user clicks on timeline to seek.
 */
function VideoTimeline({
  segments = [],
  duration = 0,
  currentTime = 0,
  onSeek = null,
}) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(0, 0, width, height);

    // Draw segments
    for (const segment of segments) {
      if (segment.emotion === 'silent') continue;

      const emotionKey = (segment.emotion || 'relaxed').toUpperCase();
      const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;

      const startX = (segment.startTime / duration) * width;
      const endX = (segment.endTime / duration) * width;
      const segWidth = Math.max(endX - startX, 4);

      ctx.fillStyle = emotionData.color + '60';
      ctx.fillRect(startX, 4, segWidth, height - 8);

      // Border
      ctx.strokeStyle = emotionData.color + '90';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, 4, segWidth, height - 8);

      // Emoji label (if segment is wide enough)
      if (segWidth > 30) {
        ctx.font = '12px sans-serif';
        ctx.fillText(emotionData.emoji, startX + segWidth / 2 - 6, height / 2 + 4);
      }
    }

    // Draw current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#FF6F00';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();

    // Draw playhead triangle
    ctx.fillStyle = '#FF6F00';
    ctx.beginPath();
    ctx.moveTo(currentX - 5, 0);
    ctx.lineTo(currentX + 5, 0);
    ctx.lineTo(currentX, 6);
    ctx.closePath();
    ctx.fill();
  }, [segments, duration, currentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSeek || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.5,
          px: 0.5,
        }}
      >
        <Typography variant="caption" sx={{ color: '#BDBDBD', fontSize: '0.65rem' }}>
          0:00
        </Typography>
        <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.65rem', fontWeight: 600 }}>
          {formatTime(currentTime)}
        </Typography>
        <Typography variant="caption" sx={{ color: '#BDBDBD', fontSize: '0.65rem' }}>
          {formatTime(duration)}
        </Typography>
      </Box>
      <Box
        sx={{
          width: '100%',
          height: 36,
          borderRadius: 2,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid rgba(255,152,0,0.15)',
        }}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </Box>

      {/* Emotion legend */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mt: 1,
          px: 0.5,
        }}
      >
        {Object.values(EMOTIONS).map((emo) => (
          <Box
            key={emo.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: emo.color,
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: '#9E9E9E' }}>
              {emo.emoji} {emo.name.split('/')[0]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Format seconds to mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoTimeline;
