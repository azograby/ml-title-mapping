'use client';

import React, { useState } from 'react';
import { Container, Typography, Paper, Button, Box, ToggleButtonGroup, ToggleButton, Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { IndexService } from '../../services/index';
import { getCurrentUser } from 'aws-amplify/auth';

type FieldType = 'VECTOR' | 'EXACT' | 'IGNORE';

interface FieldConfig {
  [key: string]: FieldType;
}

export default function CreateIndexPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[][]>([]);
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const indexService = new IndexService();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || 
                     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel';
      
      if (isExcel) {
        setSelectedFile(file);
        readExcelColumns(file);
      }
    }
  };

  const readExcelColumns = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const preview = jsonData.slice(0, 11); // Header + top 10 rows
          
          setColumns(headers);
          setPreviewData(preview);
          const initialConfig = headers.reduce((acc, col) => ({ ...acc, [col]: 'IGNORE' as FieldType }), {});
          setFieldConfig(initialConfig);
        }
      } catch (error) {
        console.error('Error reading Excel file:', error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleFieldChange = (field: string, value: FieldType | null) => {
    if (value) {
      setFieldConfig(prev => ({ ...prev, [field]: value }));
    }
  };

  const hasConfiguredFields = () => {
    return columns.some(col => fieldConfig[col] && fieldConfig[col] !== 'IGNORE');
  };

  const handleCreateIndex = async () => {
    try {
      const user = await getCurrentUser();
      const indexData = {
        fileName: selectedFile?.name,
        fieldConfiguration: fieldConfig,
        columns: columns
      };
      
      await indexService.createIndex(indexData, user.userId);
      setNotification({ open: true, message: 'Index creation initiated successfully!', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Error creating index', severity: 'error' });
    }
  };

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create Amazon OpenSearch Index
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configure Index
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
          >
            Select Excel File
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {selectedFile.name}
            </Typography>
          )}
        </Box>

        {previewData.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              File Preview (Top 10 Rows)
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {previewData[0]?.map((header: string, index: number) => (
                      <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                        {header || `Column ${index + 1}`}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(1).map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {previewData[0]?.map((_, cellIndex: number) => (
                        <TableCell key={cellIndex}>
                          {row[cellIndex]?.toString() || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {columns.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Field Configuration
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              Configure each field's type: VECTOR (similarity search), EXACT (keyword matching), or IGNORE (exclude from index).
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', gap: 3, alignItems: 'start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {columns.slice(0, Math.ceil(columns.length / 2)).map(column => (
                  <Box key={column} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {column}
                    </Typography>
                    <ToggleButtonGroup
                      value={fieldConfig[column]}
                      exclusive
                      onChange={(_, value) => handleFieldChange(column, value)}
                      size="small"
                    >
                      <ToggleButton value="VECTOR" color="primary">
                        VECTOR
                      </ToggleButton>
                      <ToggleButton value="EXACT" color="secondary">
                        EXACT
                      </ToggleButton>
                      <ToggleButton value="IGNORE">
                        IGNORE
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                ))}
              </Box>
              <Box sx={{ width: '2px', backgroundColor: 'rgba(255, 255, 255, 0.2)', height: '100%' }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {columns.slice(Math.ceil(columns.length / 2)).map(column => (
                  <Box key={column} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {column}
                    </Typography>
                    <ToggleButtonGroup
                      value={fieldConfig[column]}
                      exclusive
                      onChange={(_, value) => handleFieldChange(column, value)}
                      size="small"
                    >
                      <ToggleButton value="VECTOR" color="primary">
                        VECTOR
                      </ToggleButton>
                      <ToggleButton value="EXACT" color="secondary">
                        EXACT
                      </ToggleButton>
                      <ToggleButton value="IGNORE">
                        IGNORE
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleCreateIndex}
            disabled={!selectedFile || columns.length === 0 || !hasConfiguredFields()}
            size="large"
          >
            Create Index
          </Button>
        </Box>
      </Paper>

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