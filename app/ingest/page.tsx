'use client';

import { Container, Typography, Box, Snackbar, Alert, Stepper, Step, StepLabel, Paper, Button, Chip, Card, CardContent, StepConnector, stepConnectorClasses, StepIconProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import QueueIcon from '@mui/icons-material/Queue';
import FileUpload from '../../components/file-upload/file-upload';
import IndexDropdown from '../../components/index-dropdown/index-dropdown';
import { useState, useEffect } from 'react';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #8a2be2 0%, #00bcd4 100%)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(95deg, #8a2be2 0%, #00bcd4 100%)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#2a2a5a',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: '#2a2a5a',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  ...(ownerState.active && {
    backgroundImage: 'linear-gradient(135deg, #8a2be2 0%, #00bcd4 100%)',
    boxShadow: '0 4px 10px 0 rgba(138, 43, 226, 0.4)',
  }),
  ...(ownerState.completed && {
    backgroundImage: 'linear-gradient(135deg, #8a2be2 0%, #00bcd4 100%)',
  }),
}));

function ColorlibStepIcon(props: StepIconProps) {
  const { active, completed, className } = props;

  const icons: { [index: string]: React.ReactElement } = {
    1: <CloudUploadIcon />,
    2: <SearchIcon />,
    3: <QueueIcon />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

export default function IngestPage() {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [selectedIndex, setSelectedIndex] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ml-item-mapping-selected-index') || '';
    }
    return '';
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showIngestAlert, setShowIngestAlert] = useState<boolean>(false);
  const [hasUploaded, setHasUploaded] = useState<boolean>(false);

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({ open: true, message, severity });
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setHasUploaded(false);
    if (files.length > 0) {
      setActiveStep(1);
    }
  };

  const handleIndexChange = (index: string) => {
    setSelectedIndex(index);
    if (index) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      if (activeStep === 2) {
        setShowIngestAlert(false);
        setHasUploaded(false);
      }
      if (activeStep === 1) {
        setSelectedIndex('');
      }
    }
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    setActiveStep(0);
    setShowIngestAlert(false);
    setHasUploaded(false);
  };

  const clearIndex = () => {
    setSelectedIndex('');
    setActiveStep(1);
    setShowIngestAlert(false);
    setHasUploaded(false);
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      setActiveStep(0);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Ingest Items
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3, fontWeight: 'bold' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          Limit a single file to less than 2,000 records
        </Typography>
      </Alert>
      


      <Box sx={{ mt: 3, mb: 4 }}>
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel
          connector={<ColorlibConnector />}
          sx={{
            '& .MuiStepLabel-label': {
              color: 'white'
            },
            '& .MuiStepLabel-label.Mui-completed': {
              color: 'white',
              fontWeight: 600
            },
            '& .MuiStepLabel-label.Mui-active': {
              color: 'white',
              fontWeight: 600
            }
          }}
        >
          <Step completed={selectedFiles.length > 0}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>
              Select Excel Files
            </StepLabel>
          </Step>
          <Step completed={!!selectedIndex}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>
              Select Index
            </StepLabel>
          </Step>
          <Step>
            <StepLabel StepIconComponent={ColorlibStepIcon}>
              Ingest Records
            </StepLabel>
          </Step>
        </Stepper>
      </Box>

      {activeStep === 0 && (
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a5a 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(138, 43, 226, 0.2)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 600 }}>
              Step 1: Select Excel Files
            </Typography>
            <FileUpload 
              onUploadResult={showNotification} 
              onFilesSelected={handleFilesSelected}
              showUploadButton={false}
            />
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a5a 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(138, 43, 226, 0.2)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              Step 2: Select Index
            </Typography>
            
            {selectedFiles.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 2 }}>
                  Selected Files:
                </Typography>
                {selectedFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                    onDelete={() => removeFile(index)}
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      mb: 1,
                      mr: 1,
                      '& .MuiChip-deleteIcon': {
                        color: 'rgba(255, 255, 255, 0.7)'
                      }
                    }}
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
            <Box sx={{ mb: 3 }}>
              <IndexDropdown 
                selectedIndex={selectedIndex}
                onIndexChange={handleIndexChange}
                onError={(message) => showNotification(message, 'error')}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && (
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1a1a3a 0%, #2a2a5a 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(138, 43, 226, 0.2)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                Step 3: Ingest Records
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={`Files: ${selectedFiles.length}`} 
                  color="primary" 
                  variant="outlined"
                  onDelete={clearFiles}
                />
                <Chip 
                  label={`Index: ${selectedIndex}`} 
                  color="secondary" 
                  variant="outlined"
                  onDelete={clearIndex}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <FileUpload 
                onUploadResult={showNotification}
                selectedFiles={selectedFiles}
                selectedIndex={selectedIndex}
                showFileSelection={false}
                disabled={selectedFiles.length === 0 || !selectedIndex || hasUploaded}
                onIngestClick={() => setShowIngestAlert(true)}
                onUploadSuccess={() => setHasUploaded(true)}
              />
              {showIngestAlert && (
                <Box sx={{ mt: 2, width: '100%', maxWidth: 800 }}>
                  <Alert severity="warning" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Important: After upload, check the Amazon OpenSearch console to verify records are indexed BEFORE continuing.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
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