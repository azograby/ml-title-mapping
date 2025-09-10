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
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
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



// Custom step icon
const StepIconRoot = styled('div')<{
  ownerState: { stepNumber: number };
}>(({ theme, ownerState }) => ({
  backgroundColor: '#8a2be2',
  color: '#fff',
  width: 60,
  height: 60,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  boxShadow: '0 4px 10px 0 rgba(138, 43, 226, 0.3)',
}));

function CustomStepIcon(props: { stepNumber: number; icon: React.ReactElement }) {
  return (
    <StepIconRoot ownerState={{ stepNumber: props.stepNumber }}>
      {props.stepNumber}
    </StepIconRoot>
  );
}

export default function App() {
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
      label: 'Ingest Metadata',
      description: 'Upload Excel sheet with title metadata to begin the mapping process. Data is ingested into Amazon OpenSearch, and a work queue is created in Amazon DynamoDB.',
      icon: <CloudUploadIcon />
    },
    {
      label: 'Create Search Configuration',
      description: 'Set up search configuration with parameters used to determine similarity between titles. Define weights and thresholds for each field to be used in an Amazon OpenSearch query.',
      icon: <SettingsIcon />
    },
    {
      label: 'Map Titles',
      description: 'Using k-NN and hybrid search powered by Amazon OpenSearch and your search configuration, find the similar titles for each title. Then, create a grouping based on the titles you select.',
      icon: <AccountTreeIcon />
    },
  ];

  return (
    <div className={styles['home-container']}>
      <h1>Title Mapping Dashboard</h1>
      <p>Welcome to the Title Mapping Solution</p>
      
      <Box sx={{ maxWidth: 600, margin: '40px auto', p: 3 }}>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 500, textAlign: 'center' }}>
          Title Mapping Process
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((step, index) => (
            <Box key={step.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
              <CustomStepIcon stepNumber={index + 1} icon={step.icon} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#8a2be2' }}>
                  {step.label}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
                  {step.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
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