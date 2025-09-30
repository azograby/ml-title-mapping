"use client";

import "./app.css";
import React, { useState, useEffect } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
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
import TuneIcon from '@mui/icons-material/Tune';
import { StepIconProps } from '@mui/material/StepIcon';
import { styled } from '@mui/material/styles';



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
  
  useEffect(() => {
    setLoading(false);
  }, []);

  const steps = [
    {
      label: 'Create Index',
      description: 'Analyze Excel metadata to configure which fields should be vector fields for semantic search and which should be exact match fields for precise filtering.',
      icon: <TuneIcon />
    },
    {
      label: 'Ingest Metadata',
      description: 'Upload Excel sheet with item metadata to begin the mapping process. Data is ingested into Amazon OpenSearch, and a work queue is created in Amazon DynamoDB.',
      icon: <CloudUploadIcon />
    },
    {
      label: 'Configure Search',
      description: 'Set up search configuration with parameters used to determine similarity between items. Define weights and thresholds for each field to be used in an Amazon OpenSearch query.',
      icon: <SettingsIcon />
    },
    {
      label: 'Map Items',
      description: 'Using k-NN and hybrid search powered by Amazon OpenSearch and your search configuration, find the similar items for each item. Then, create a grouping based on the items you select.',
      icon: <AccountTreeIcon />
    },
  ];

  return (
    <div className={styles['home-container']}>
      <h1>Item Mapping Dashboard</h1>
      <p>The Item Mapping Solution assists in grouping similar items together.</p>
      
      <Box sx={{ maxWidth: 1200, margin: '40px auto', p: 3 }}>
        <Typography variant="h4" sx={{ mb: 6, fontWeight: 600, textAlign: 'center', color: '#8a2be2' }}>
          Item Mapping Workflow
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          gap: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '60px',
            left: '15%',
            right: '15%',
            height: '2px',
            background: 'linear-gradient(90deg, #8a2be2 0%, #00bcd4 100%)',
            zIndex: 0
          }
        }}>
          {steps.map((step, index) => (
            <Box key={step.label} sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              <Box sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8a2be2 0%, #00bcd4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 32px rgba(138, 43, 226, 0.3)',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                '& svg': {
                  fontSize: '3rem',
                  color: 'white'
                }
              }}>
                {step.icon}
              </Box>
              
              <Box sx={{
                background: 'rgba(26, 26, 58, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                p: 3,
                border: '1px solid rgba(138, 43, 226, 0.2)',
                height: 240,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  mb: 2, 
                  color: '#8a2be2',
                  fontSize: '1.1rem'
                }}>
                  {index + 1}. {step.label}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  lineHeight: 1.5,
                  fontSize: '0.9rem'
                }}>
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
      

    </div>
  );
}