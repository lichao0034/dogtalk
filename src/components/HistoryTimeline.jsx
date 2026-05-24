/**
 * HistoryTimeline - displays recent emotion translation history.
 * Shows the last 10 detected emotions with timestamps.
 */

import React from 'react';
import { Box, Typography, Card, List, ListItem, ListItemAvatar, Avatar, ListItemText } from '@mui/material';
import { EMOTIONS } from '../constants/emotions';

/**
 * HistoryTimeline component.
 * @param {Object} props
 * @param {Array} props.history - Array of history entries.
 * @param {string} props.history[].emotion - Emotion ID.
 * @param {number} props.history[].confidence - Confidence percentage.
 * @param {number} props.history[].timestamp - Timestamp in ms.
 * @param {string} props.history[].frequency - Formatted frequency string.
 */
function HistoryTimeline({ history = [] }) {
  if (history.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#BDBDBD' }}>
          🐕 还没有翻译记录
        </Typography>
        <Typography variant="caption" sx={{ color: '#E0E0E0' }}>
          点击下方按钮开始监听狗狗的声音
        </Typography>
      </Box>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        mx: 2,
        my: 1,
        borderRadius: 3,
        bgcolor: 'white',
        border: '1px solid rgba(255,152,0,0.08)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,152,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: '#FF9800', fontWeight: 700, fontSize: '0.85rem' }}
        >
          📋 翻译记录
        </Typography>
        <Typography variant="caption" sx={{ color: '#BDBDBD', fontSize: '0.65rem' }}>
          最近 {history.length} 条
        </Typography>
      </Box>

      <List sx={{ py: 0, maxHeight: 320, overflow: 'auto' }}>
        {history.map((entry, index) => {
          const emotionKey = (entry.emotion || 'relaxed').toUpperCase();
          const emotionData = EMOTIONS[emotionKey] || EMOTIONS.RELAXED;
          const time = new Date(entry.timestamp);
          const timeStr = time.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <ListItem
              key={`${entry.timestamp}-${index}`}
              sx={{
                px: 2,
                py: 1,
                borderBottom: index < history.length - 1 ? '1px solid #FFF3E0' : 'none',
                '&:hover': {
                  bgcolor: emotionData.bgColor,
                },
                transition: 'background 0.2s ease',
              }}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: emotionData.color,
                        bgcolor: emotionData.bgColor,
                        px: 0.8,
                        py: 0.1,
                        borderRadius: 1,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                      }}
                    >
                      {entry.confidence}%
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: '#BDBDBD', fontSize: '0.65rem' }}>
                    {timeStr}
                    {entry.frequency && ` · ${entry.frequency}`}
                  </Typography>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Card>
  );
}

export default HistoryTimeline;
