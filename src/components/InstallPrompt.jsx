import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('dogtalk-install-dismissed')) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay
      setTimeout(() => setShowInstall(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[DogTalk] App installed!');
    }
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    setDismissed(true);
    localStorage.setItem('dogtalk-install-dismissed', 'true');
  };

  if (!showInstall || dismissed) return null;

  return (
    <Snackbar
      open={showInstall}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        icon={<DownloadIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleDismiss}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              <CloseIcon fontSize="small" />
            </Button>
            <Button
              size="small"
              variant="contained"
              color="inherit"
              onClick={handleInstall}
              sx={{
                fontWeight: 600,
                bgcolor: 'rgba(255,255,255,0.3)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.5)' },
              }}
            >
              安装
            </Button>
          </Box>
        }
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="body2" fontWeight={500}>
          🐕 安装 DogTalk 到桌面，像 App 一样使用！
        </Typography>
      </Alert>
    </Snackbar>
  );
}
