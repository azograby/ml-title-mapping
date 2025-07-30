'use client';

import { Container, Typography, Box, Snackbar, Alert } from '@mui/material';
import FileUpload from '../../components/file-upload/file-upload';
import { useState } from 'react';

export default function IngestPage() {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ingest Titles
      </Typography>
      <Box sx={{ mt: 3 }}>
        <FileUpload onUploadResult={showNotification} />
      </Box>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert onClose={handleNotificationClose} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}