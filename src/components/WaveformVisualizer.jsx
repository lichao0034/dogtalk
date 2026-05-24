/**
 * WaveformVisualizer - renders real-time audio waveform using Canvas.
 * Displays both the time-domain waveform and a frequency spectrum bar chart.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';

/**
 * WaveformVisualizer component.
 * @param {Object} props
 * @param {Float32Array|null} props.timeDomainData - Time domain audio data.
 * @param {Uint8Array|null} props.frequencyData - Frequency domain audio data (byte).
 * @param {boolean} props.isActive - Whether visualization is active.
 * @param {string} props.emotionColor - Current emotion color for theming.
 * @param {number} props.height - Canvas height in pixels.
 */
function WaveformVisualizer({
  timeDomainData = null,
  frequencyData = null,
  isActive = false,
  emotionColor = '#FF9800',
  height = 120,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(255, 248, 225, 0.3)';
    ctx.fillRect(0, 0, width, height);

    if (!isActive) {
      // Draw idle state - gentle sine wave
      ctx.beginPath();
      ctx.strokeStyle = '#FFE0B2';
      ctx.lineWidth = 2;
      const time = Date.now() / 1000;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.02 + time) * 5;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      return;
    }

    // Draw frequency spectrum bars (background)
    if (frequencyData && frequencyData.length > 0) {
      const barCount = Math.min(frequencyData.length, 64);
      const barWidth = width / barCount;
      const step = Math.floor(frequencyData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = frequencyData[i * step] / 255;
        const barHeight = value * height * 0.7;

        // Create gradient for bars
        const alpha = 0.15 + value * 0.2;
        ctx.fillStyle = emotionColor + Math.round(alpha * 255).toString(16).padStart(2, '0');

        const x = i * barWidth;
        const y = height - barHeight;
        const radius = 2;

        // Rounded top bars
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - 1 - radius, y);
        ctx.quadraticCurveTo(x + barWidth - 1, y, x + barWidth - 1, y + radius);
        ctx.lineTo(x + barWidth - 1, height);
        ctx.lineTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
      }
    }

    // Draw waveform (foreground)
    if (timeDomainData && timeDomainData.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = emotionColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const sliceWidth = width / timeDomainData.length;
      let x = 0;

      for (let i = 0; i < timeDomainData.length; i++) {
        const v = timeDomainData[i];
        const y = (v + 1) / 2 * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Draw glow effect
      ctx.beginPath();
      ctx.strokeStyle = emotionColor + '40';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      x = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const v = timeDomainData[i];
        const y = (v + 1) / 2 * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
    }
  }, [timeDomainData, frequencyData, isActive, emotionColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Update canvas internal dimensions for drawing
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <Box
      sx={{
        width: '100%',
        height: height,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'rgba(255,248,225,0.3)',
        border: '1px solid rgba(255,152,0,0.1)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
}

export default WaveformVisualizer;
