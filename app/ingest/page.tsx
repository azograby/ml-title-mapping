'use client';

import { Container, Typography, Box, Snackbar, Alert, Stepper, Step, StepLabel } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import QueueIcon from '@mui/icons-material/Queue';
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
      
      <Alert severity="warning" sx={{ mb: 3, fontWeight: 'bold' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          Important Note: After upload, you must check the Amazon OpenSearch console to make sure records have been indexed BEFORE continuing.
        </Typography>
      </Alert>

      <Alert severity="warning" sx={{ mb: 3, fontWeight: 'bold' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          Important Note: Do not upload the same records more than once, and limit a single file to less than 2000 records.
        </Typography>
      </Alert>
      
      <Box sx={{ mt: 3 }}>
        <FileUpload onUploadResult={showNotification} />
      </Box>
      
      <Box sx={{ mt: 6 }}>
        <Stepper alternativeLabel>
          <Step>
            <StepLabel icon={<CloudUploadIcon />}>
              Upload Excel file with title metadata
            </StepLabel>
          </Step>
          <Step>
            <StepLabel icon={<SearchIcon />}>
              Extract fields and index into Amazon OpenSearch with vector embeddings
            </StepLabel>
          </Step>
          <Step>
            <StepLabel icon={<QueueIcon />}>
              Add records to title processing queue for review on the Title Mapper page
            </StepLabel>
          </Step>
        </Stepper>
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