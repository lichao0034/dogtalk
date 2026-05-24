/**
 * LiveMonitor - Real-time microphone monitoring page.
 * Handles microphone access, real-time audio analysis, emotion classification,
 * and displays the results with waveform visualization and history.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { AudioAnalyzer } from '../audio/audioAnalyzer';
import { classifyEmotion, resetClassifier } from '../audio/emotionClassifier';
import { EMOTIONS } from '../constants/emotions';
import WaveformVisualizer from './WaveformVisualizer';
import EmotionCard from './EmotionCard';
import HistoryTimeline from './HistoryTimeline';

/** Maximum number of history entries to keep */
const MAX_HISTORY = 10;

function LiveMonitor() {
  // State
  const [isListening, setIsListening] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('relaxed');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [currentFeatures, setCurrentFeatures] = useState(null);
  const [isBarking, setIsBarking] = useState(false);
  const [history, setHistory] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [waveformData, setWaveformData] = useState({ timeDomain: null, frequency: null });

  // Refs
  const analyzerRef = useRef(null);
  const lastHistoryTimeRef = useRef(0);

  /**
   * Start listening to the microphone.
   */
  const startListening = useCallback(async () => {
    setIsInitializing(true);

    const analyzer = new AudioAnalyzer();
    analyzerRef.current = analyzer;

    // Set up callbacks
    analyzer.onFeaturesUpdate = (features) => {
      // Classify emotion from features
      const result = classifyEmotion(features, true);

      setCurrentEmotion(result.emotion);
      setCurrentConfidence(result.confidence);
      setCurrentFeatures(features);
      setIsBarking(features.isBarking);

      // Add to history if enough time has passed and confidence is decent
      const now = Date.now();
      if (
        result.confidence > 15 &&
        now - lastHistoryTimeRef.current > 2000 &&
        features.isBarking
      ) {
        lastHistoryTimeRef.current = now;
        setHistory((prev) => {
          const newEntry = {
            emotion: result.emotion,
            confidence: result.confidence,
            timestamp: now,
            frequency: `${Math.round(features.dominantFrequency)}Hz`,
          };
          const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
          return updated;
        });
      }
    };

    analyzer.onWaveformData = (timeDomain, frequency) => {
      setWaveformData({ timeDomain, frequency });
    };

    analyzer.onBarkDetected = (barkEvent) => {
      // Bark detected - could trigger haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    };

    const success = await analyzer.start();
    setIsInitializing(false);

    if (success) {
      setIsListening(true);
      setSnackbar({ open: true, message: '🎙️ 麦克风已开启，开始监听...', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: '无法访问麦克风，请检查权限设置', severity: 'error' });
    }
  }, []);

  /**
   * Stop listening to the microphone.
   */
  const stopListening = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
      analyzerRef.current = null;
    }
    resetClassifier();
    setIsListening(false);
    setIsBarking(false);
    setWaveformData({ timeDomain: null, frequency: null });
    setSnackbar({ open: true, message: '🔇 已停止监听', severity: 'info' });
  }, []);

  /**
   * Toggle listening state.
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop();
      }
    };
  }, []);

  const emotionKey = currentEmotion.toUpperCase();
  const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 1,
        pt: 2,
        pb: 1,
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* Current Emotion Card */}
      <EmotionCard
        emotion={currentEmotion}
        confidence={currentConfidence}
        isBarking={isBarking}
        features={currentFeatures}
      />

      {/* Waveform Visualization */}
      <Box sx={{ width: '100%', px: 2, my: 1.5 }}>
        <WaveformVisualizer
          timeDomainData={waveformData.timeDomain}
          frequencyData={waveformData.frequency}
          isActive={isListening}
          emotionColor={emotionData.color}
          height={100}
        />
      </Box>

      {/* Big Listen Button */}
      <Box
        sx={{
          position: 'relative',
          my: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <Box
              className="pulse-ring"
              sx={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: '50%',
                border: `3px solid ${emotionData.color}40`,
              }}
            />
            <Box
              className="pulse-ring"
              sx={{
                position: 'absolute',
                width: 170,
                height: 170,
                borderRadius: '50%',
                border: `2px solid ${emotionData.color}20`,
                animationDelay: '0.5s',
              }}
            />
          </>
        )}

        <IconButton
          onClick={toggleListening}
          disabled={isInitializing}
          sx={{
            width: 110,
            height: 110,
            bgcolor: isListening ? emotionData.color : '#FF9800',
            color: 'white',
            boxShadow: isListening
              ? `0 4px 30px ${emotionData.color}60`
              : '0 4px 20px rgba(255,152,0,0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: isListening ? emotionData.color : '#F57C00',
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
            '&.Mui-disabled': {
              bgcolor: '#FFCC80',
            },
          }}
        >
          {isInitializing ? (
            <CircularProgress size={40} sx={{ color: 'white' }} />
          ) : isListening ? (
            <MicOffIcon sx={{ fontSize: 48 }} />
          ) : (
            <MicIcon sx={{ fontSize: 48 }} />
          )}
        </IconButton>
      </Box>

      {/* Status text */}
      <Typography
        variant="caption"
        sx={{
          color: isListening ? emotionData.color : '#BDBDBD',
          fontWeight: 600,
          fontSize: '0.8rem',
          mb: 1,
        }}
      >
        {isInitializing
          ? '正在请求麦克风权限...'
          : isListening
          ? '正在监听中...点击停止'
          : '点击开始监听'}
      </Typography>

      {/* History Timeline */}
      <Box sx={{ width: '100%', flex: 1 }}>
        <HistoryTimeline history={history} />
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontSize: '0.85rem' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LiveMonitor;
