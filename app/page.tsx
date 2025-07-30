"use client";

import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { parseAmplifyConfig } from "aws-amplify/utils";
import "./app.css";
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ConfigurationService } from '../services/configuration';
import { searchConfigStoreActions } from '../store/search-config';
import { Backdrop, CircularProgress, Snackbar, Alert } from '@mui/material';
import styles from './page.module.css';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import { StepIconProps } from '@mui/material/StepIcon';
import { styled } from '@mui/material/styles';

const amplifyConfig = parseAmplifyConfig(outputs);

Amplify.configure(
  {
    ...amplifyConfig,
    API: {
      ...amplifyConfig.API,
      REST: outputs.custom.API,
    },
  }
);

// Custom connector for the stepper
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

// Custom step icon
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
    2: <VideoLibraryIcon />,
    3: <CheckCircleIcon />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
  const dispatch = useDispatch();
  const configService = new ConfigurationService();
  
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        // First try to load custom config
        const customConfig = await configService.getCustomSearchConfig();
        dispatch(searchConfigStoreActions.setSearchConfig(customConfig));
        console.log('Custom configuration loaded successfully');
        setNotification({ open: true, message: 'Using CUSTOM search configuration file', severity: 'info' });
      } catch (customError) {
        // If custom config doesn't exist, try default config
        try {
          const defaultConfig = await configService.getDefaultSearchConfig();
          dispatch(searchConfigStoreActions.setSearchConfig(defaultConfig));
          console.log('Default configuration loaded successfully');
          setNotification({ open: true, message: 'Using DEFAULT search configuration file', severity: 'info' });
        } catch (defaultError) {
          setNotification({ open: true, message: 'Could not load or find Default configuration file', severity: 'error' });
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadConfiguration();
  }, []);

  const steps = [
    {
      label: 'Upload Video',
      description: 'Select and upload your video file for content compliance analysis.',
    },
    {
      label: 'Processing',
      description: 'Your video is being analyzed for content compliance issues.',
    },
    {
      label: 'Results',
      description: 'View detailed compliance results and take appropriate actions.',
    },
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className={styles['home-container']}>
      <h1>Title Mapping Dashboard</h1>
      <p>Welcome to the Title Mapping Solution</p>
      
      <Box sx={{ maxWidth: 800, margin: '40px auto', p: 3 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 500, textAlign: 'center' }}>
          Video Upload Process
        </Typography>
        
        <Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel StepIconComponent={ColorlibStepIcon}>
                <Typography sx={{ fontWeight: 500 }}>{step.label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === steps.length ? (
          <Paper square elevation={0} sx={{ p: 3, mt: 3, bgcolor: 'rgba(26, 26, 46, 0.6)', borderRadius: 2 }}>
            <Typography>All steps completed - your video has been analyzed</Typography>
            <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
              Start New Analysis
            </Button>
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: 3, mt: 3, bgcolor: 'rgba(26, 26, 46, 0.6)', borderRadius: 2 }}>
              <Typography>{steps[activeStep].description}</Typography>
              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Back
                  </Button>
                </div>
              </Box>
            </Paper>
          </>
        )}
      </Box>
      
      <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" color="white">
            Loading Configuration...
          </Typography>
        </Box>
      </Backdrop>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={notification.severity} onClose={() => setNotification(prev => ({ ...prev, open: false }))}>
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}