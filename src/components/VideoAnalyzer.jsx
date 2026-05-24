/**
 * VideoAnalyzer - Video file analysis page.
 * Allows users to select a local video file, analyze its audio track,
 * and display emotion annotations along a timeline.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MovieIcon from '@mui/icons-material/Movie';
import { EMOTIONS } from '../constants/emotions';
import { classifyEmotion, resetClassifier } from '../audio/emotionClassifier';
import VideoTimeline from './VideoTimeline';

function VideoAnalyzer() {
  // State
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [segments, setSegments] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegmentEmotion, setCurrentSegmentEmotion] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);

  /**
   * Handle file selection.
   */
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify it's a video file
    if (!file.type.startsWith('video/')) {
      return;
    }

    // Revoke previous URL if any
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setSegments([]);
    setCurrentSegmentEmotion(null);
    resetClassifier();
  }, [videoUrl]);

  /**
   * Trigger file input.
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle video metadata loaded.
   */
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  /**
   * Handle time update during playback.
   */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Find current segment emotion
    const current = segments.find(
      (s) => video.currentTime >= s.startTime && video.currentTime < s.endTime
    );
    if (current && current.emotion !== 'silent') {
      setCurrentSegmentEmotion(current);
    }
  }, [segments]);

  /**
   * Toggle video playback.
   */
  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  /**
   * Seek to a specific time.
   */
  const handleSeek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  /**
   * Handle video end.
   */
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Analyze the video's audio for emotions.
   * Uses a step-through approach: we create an offline audio context
   * to decode the audio, then analyze it in segments.
   */
  const analyzeVideo = useCallback(async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setSegments([]);
    resetClassifier();

    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await videoFile.arrayBuffer();

      // Create an offline audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const sampleRate = audioBuffer.sampleRate;
      const totalDuration = audioBuffer.duration;
      const channelData = audioBuffer.getChannelData(0); // Use first channel

      // Create a temporary analyser setup for feature extraction
      const offlineAnalyzer = new OfflineAudioContext(1, channelData.length, sampleRate);

      // Analyze in segments
      const segmentDuration = 2.0; // seconds per segment
      const overlapDuration = 0.5; // overlap for better detection
      const results = [];
      const fftSize = 2048;
      const hopSize = Math.floor(segmentDuration * sampleRate);
      const overlapSize = Math.floor(overlapDuration * sampleRate);

      for (let offset = 0; offset < channelData.length; offset += (hopSize - overlapSize)) {
        const segmentStart = offset / sampleRate;
        const segmentEnd = Math.min((offset + hopSize) / sampleRate, totalDuration);

        if (segmentEnd - segmentStart < 0.5) break; // Skip very short segments

        // Extract this segment's audio data
        const segmentLength = Math.min(hopSize, channelData.length - offset);
        const segmentData = channelData.slice(offset, offset + segmentLength);

        // Calculate features for this segment
        const features = extractSegmentFeatures(segmentData, sampleRate, fftSize);

        // Only classify if there's enough energy (not silence)
        if (features.energy > 0.02) {
          const result = classifyEmotion(features, false);
          if (result.confidence > 10) {
            results.push({
              startTime: segmentStart,
              endTime: segmentEnd,
              emotion: result.emotion,
              confidence: result.confidence,
            });
          }
        }

        // Update progress
        setAnalysisProgress(Math.min(segmentEnd / totalDuration, 1));
      }

      // Merge adjacent segments with the same emotion
      const mergedResults = mergeSegments(results);

      setSegments(mergedResults);
      audioContext.close();
    } catch (error) {
      console.error('Video analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(1);
    }
  }, [videoFile]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        pt: 2,
        pb: 2,
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Video Upload Area */}
      {!videoUrl && (
        <Card
          elevation={0}
          sx={{
            width: '100%',
            py: 6,
            px: 3,
            textAlign: 'center',
            borderRadius: 4,
            border: '2px dashed #FFCC80',
            bgcolor: '#FFF8E1',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#FF9800',
              bgcolor: '#FFF3E0',
            },
          }}
          onClick={handleUploadClick}
        >
          <UploadFileIcon sx={{ fontSize: 48, color: '#FFCC80', mb: 1 }} />
          <Typography variant="body1" sx={{ color: '#FF9800', fontWeight: 600 }}>
            点击选择视频文件
          </Typography>
          <Typography variant="caption" sx={{ color: '#BDBDBD' }}>
            支持 MP4、MOV、WebM 等格式
          </Typography>
        </Card>
      )}

      {/* Video Player */}
      {videoUrl && (
        <>
          <Box
            sx={{
              width: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#000',
              position: 'relative',
              mb: 1.5,
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleVideoLoaded}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{
                width: '100%',
                maxHeight: '300px',
                display: 'block',
              }}
              playsInline
            />

            {/* Play/Pause overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                display: 'flex',
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={togglePlayback}
                sx={{
                  minWidth: 36,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </Button>
            </Box>

            {/* Current emotion overlay */}
            {currentSegmentEmotion && isPlaying && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Typography sx={{ fontSize: '1rem' }}>
                  {EMOTIONS[currentSegmentEmotion.emotion.toUpperCase()]?.emoji || '🐕'}
                </Typography>
                <Typography
                  sx={{
                    color: EMOTIONS[currentSegmentEmotion.emotion.toUpperCase()]?.color || '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {EMOTIONS[currentSegmentEmotion.emotion.toUpperCase()]?.name || ''}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Timeline */}
          <Box sx={{ width: '100%', mb: 1.5 }}>
            <VideoTimeline
              segments={segments}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, width: '100%' }}>
            <Button
              variant="outlined"
              startIcon={<MovieIcon />}
              onClick={handleUploadClick}
              sx={{
                flex: 1,
                borderColor: '#FFCC80',
                color: '#FF9800',
                '&:hover': { borderColor: '#FF9800', bgcolor: '#FFF8E1' },
              }}
            >
              换视频
            </Button>
            <Button
              variant="contained"
              startIcon={isAnalyzing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <UploadFileIcon />}
              onClick={analyzeVideo}
              disabled={isAnalyzing}
              sx={{
                flex: 2,
                bgcolor: '#FF9800',
                '&:hover': { bgcolor: '#F57C00' },
                '&.Mui-disabled': { bgcolor: '#FFCC80' },
              }}
            >
              {isAnalyzing ? '分析中...' : '开始分析'}
            </Button>
          </Box>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#FF9800' }}>
                  正在分析音频...
                </Typography>
                <Typography variant="caption" sx={{ color: '#FF9800' }}>
                  {Math.round(analysisProgress * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={analysisProgress * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#FFF3E0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: '#FF9800',
                  },
                }}
              />
            </Box>
          )}

          {/* Analysis Results */}
          {segments.length > 0 && !isAnalyzing && (
            <Card
              elevation={0}
              sx={{
                width: '100%',
                borderRadius: 3,
                border: '1px solid rgba(255,152,0,0.1)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid rgba(255,152,0,0.08)',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ color: '#FF9800', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  📊 分析结果 · 共 {segments.length} 段
                </Typography>
              </Box>

              <List sx={{ py: 0, maxHeight: 300, overflow: 'auto' }}>
                {segments
                  .filter((s) => s.emotion !== 'silent')
                  .map((segment, index) => {
                    const emotionKey = (segment.emotion || 'relaxed').toUpperCase();
                    const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;

                    return (
                      <ListItem
                        key={index}
                        sx={{
                          px: 2,
                          py: 1,
                          borderBottom:
                            index < segments.length - 1 ? '1px solid #FFF3E0' : 'none',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: emotionData.bgColor },
                        }}
                        onClick={() => handleSeek(segment.startTime)}
                      >
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: emotionData.bgColor,
                              fontSize: '1.1rem',
                              border: `2px solid ${emotionData.color}30`,
                            }}
                          >
                            {emotionData.emoji}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: emotionData.color,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {emotionData.name}
                              </Typography>
                              <Chip
                                label={`${segment.confidence}%`}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.6rem',
                                  bgcolor: emotionData.bgColor,
                                  color: emotionData.color,
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{ color: '#BDBDBD', fontSize: '0.65rem' }}
                            >
                              {formatTime(segment.startTime)} -{' '}
                              {formatTime(segment.endTime)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
              </List>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}

/**
 * Extract audio features from a segment of PCM data.
 * @param {Float32Array} segmentData - PCM audio data for the segment.
 * @param {number} sampleRate - Sample rate in Hz.
 * @param {number} fftSize - FFT size.
 * @returns {Object} Extracted features.
 */
function extractSegmentFeatures(segmentData, sampleRate, fftSize) {
  // Calculate RMS energy
  let sum = 0;
  for (let i = 0; i < segmentData.length; i++) {
    sum += segmentData[i] * segmentData[i];
  }
  const rms = Math.sqrt(sum / segmentData.length);

  // Simple FFT-like frequency analysis using zero-crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < segmentData.length; i++) {
    if (
      (segmentData[i] >= 0 && segmentData[i - 1] < 0) ||
      (segmentData[i] < 0 && segmentData[i - 1] >= 0)
    ) {
      zeroCrossings++;
    }
  }
  const dominantFrequency = (zeroCrossings / 2) * (sampleRate / segmentData.length);

  // Calculate pitch variation by splitting into sub-segments
  const subSegmentLength = Math.floor(segmentData.length / 5);
  const subFrequencies = [];
  for (let s = 0; s < 5; s++) {
    const start = s * subSegmentLength;
    const end = Math.min(start + subSegmentLength, segmentData.length);
    let zc = 0;
    for (let i = start + 1; i < end; i++) {
      if (
        (segmentData[i] >= 0 && segmentData[i - 1] < 0) ||
        (segmentData[i] < 0 && segmentData[i - 1] >= 0)
      ) {
        zc++;
      }
    }
    subFrequencies.push((zc / 2) * (sampleRate / (end - start)));
  }

  // Pitch variation
  const meanFreq = subFrequencies.reduce((a, b) => a + b, 0) / subFrequencies.length;
  const freqVariance =
    subFrequencies.reduce((s, f) => s + Math.pow(f - meanFreq, 2), 0) / subFrequencies.length;
  const pitchVariation = Math.min(Math.sqrt(freqVariance) / 300, 1.0);

  // Pitch slope (linear regression)
  let slopeSumX = 0,
    slopeSumY = 0,
    slopeSumXY = 0,
    slopeSumX2 = 0;
  const n = subFrequencies.length;
  for (let i = 0; i < n; i++) {
    slopeSumX += i;
    slopeSumY += subFrequencies[i];
    slopeSumXY += i * subFrequencies[i];
    slopeSumX2 += i * i;
  }
  const denom = n * slopeSumX2 - slopeSumX * slopeSumX;
  const pitchSlope = denom !== 0 ? (n * slopeSumXY - slopeSumX * slopeSumY) / denom : 0;

  // Estimate bark count by detecting energy bursts
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const energyProfile = [];
  for (let i = 0; i < segmentData.length; i += windowSize) {
    let windowEnergy = 0;
    const end = Math.min(i + windowSize, segmentData.length);
    for (let j = i; j < end; j++) {
      windowEnergy += segmentData[j] * segmentData[j];
    }
    energyProfile.push(Math.sqrt(windowEnergy / (end - i)));
  }

  // Count energy bursts above threshold
  let barkCount = 0;
  let inBurst = false;
  const energyThreshold = 0.03;
  for (const e of energyProfile) {
    if (e > energyThreshold && !inBurst) {
      barkCount++;
      inBurst = true;
    } else if (e < energyThreshold * 0.5) {
      inBurst = false;
    }
  }

  // Duration
  const duration = segmentData.length / sampleRate;

  return {
    dominantFrequency: Math.max(0, dominantFrequency),
    energy: rms,
    spectralCentroid: dominantFrequency, // Simplified
    pitchVariation,
    pitchSlope,
    duration,
    barkCount,
    avgBarkInterval: barkCount > 1 ? duration / (barkCount - 1) : 0,
    regularityScore: 0.5, // Default, would need more analysis for accuracy
  };
}

/**
 * Merge adjacent segments with the same emotion.
 * @param {Array} segments - Array of segment objects.
 * @returns {Array} Merged segments.
 */
function mergeSegments(segments) {
  if (segments.length === 0) return [];

  const merged = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1];
    const current = segments[i];

    if (last.emotion === current.emotion && current.startTime - last.endTime < 1.0) {
      // Merge
      last.endTime = current.endTime;
      last.confidence = Math.max(last.confidence, current.confidence);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Format seconds to m:ss.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoAnalyzer;
