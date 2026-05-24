import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MovieIcon from '@mui/icons-material/Movie';
import LiveMonitor from './components/LiveMonitor';
import VideoAnalyzer from './components/VideoAnalyzer';
import InstallPrompt from './components/InstallPrompt';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFC107',
      light: '#FFD54F',
      dark: '#FFA000',
    },
    background: {
      default: '#FFF8E1',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Noto Sans SC", Roboto, "Helvetica Neue", Arial, sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(255, 152, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          maxWidth: '100vw',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)',
            borderBottom: 'none',
          }}
        >
          <Toolbar sx={{ justifyContent: 'center', minHeight: '56px !important' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '1.1rem',
              }}
            >
              🐕 DogTalk · 狗语翻译官
            </Typography>
          </Toolbar>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              '& .MuiTabs-indicator': {
                backgroundColor: 'white',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 44,
                '&.Mui-selected': {
                  color: 'white',
                },
              },
            }}
          >
            <Tab icon={<MicIcon />} label="实时监听" iconPosition="start" />
            <Tab icon={<MovieIcon />} label="视频分析" iconPosition="start" />
          </Tabs>
        </AppBar>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            pb: 2,
          }}
        >
          {activeTab === 0 && <LiveMonitor />}
          {activeTab === 1 && <VideoAnalyzer />}
        </Box>

        {/* Footer Disclaimer */}
        <Box
          sx={{
            py: 1.5,
            px: 2,
            textAlign: 'center',
            bgcolor: 'rgba(255,152,0,0.06)',
            borderTop: '1px solid rgba(255,152,0,0.1)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#BDBDBD', fontSize: '0.7rem' }}
          >
            ⚠️ 本应用基于声学特征分析，仅供参考和娱乐
          </Typography>
        </Box>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </Box>
    </ThemeProvider>
  );
}

export default App;
