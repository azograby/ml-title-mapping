import * as React from "react";
import { AssetsService } from "../../services/assets";
import { useDispatch, useSelector } from 'react-redux';
import { IUserStateReducer } from "../../store/auth";
import { Box, Button, Typography, List, ListItem, ListItemText } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

interface FileUploadProps {
  onUploadResult: (message: string, severity: 'success' | 'error') => void;
  onFilesSelected?: (files: File[]) => void;
  selectedFiles?: File[];
  selectedIndex?: string;
  showUploadButton?: boolean;
  showFileSelection?: boolean;
  disabled?: boolean;
  onIngestClick?: () => void;
  onUploadSuccess?: () => void;
}

export default function FileUpload({ 
  onUploadResult, 
  onFilesSelected, 
  selectedFiles, 
  selectedIndex, 
  showUploadButton = true, 
  showFileSelection = true, 
  disabled = false,
  onIngestClick,
  onUploadSuccess 
}: FileUploadProps) {
  const currentUser = useSelector((state: IUserStateReducer) => {
    return state.authReducer.user;
  });

  const dispatch = useDispatch();
  const svc = new AssetsService();
  
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const filesToUse = selectedFiles || files;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const excelFiles = selectedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    setFiles(excelFiles);
    if (onFilesSelected) {
      onFilesSelected(excelFiles);
    }
  };

  const uploadFiles = async () => {
    if (filesToUse.length === 0 || !selectedIndex) return;
    
    if (onIngestClick) {
      onIngestClick();
    }
    
    setUploading(true);
    try {
      const results = await svc.uploadFiles(filesToUse, selectedIndex);
      const errors = results.filter((r) => r.status === 'failed');
      const successful = results.filter((r) => r.status === 'success');
      
      if (errors.length > 0) {
        onUploadResult(`${errors.length} file(s) failed to upload`, 'error');
      } else {
        onUploadResult(`File processing has begun for ${successful.length} file(s). Check the Amazon OpenSearch console to verify indexing.`, 'success');
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        setFiles([]);
      }
    } catch (error) {
      onUploadResult('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const excelFiles = droppedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    setFiles(excelFiles);
    if (onFilesSelected) {
      onFilesSelected(excelFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <>
      {showFileSelection && (
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            border: '2px dashed rgba(138, 43, 226, 0.3)',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              border: '2px dashed rgba(138, 43, 226, 0.6)',
              backgroundColor: 'rgba(138, 43, 226, 0.05)'
            }
          }}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'rgba(138, 43, 226, 0.6)', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Drop Excel files here or click to select
          </Typography>
          <input
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="excel-file-upload"
            multiple
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="excel-file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUpload />}
              sx={{ 
                mt: 2,
                color: 'white',
                borderColor: 'white'
              }}
            >
              Select Files
            </Button>
          </label>

          {filesToUse.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files:
              </Typography>
              <List dense>
                {filesToUse.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={file.name} secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}
      
      {showUploadButton && (
        <Button
          variant="contained"
          onClick={uploadFiles}
          disabled={filesToUse.length === 0 || disabled || !selectedIndex || uploading}
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #8a2be2 0%, #00bcd4 100%)',
            border: 0,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(138, 43, 226, 0.3)',
            color: 'white',
            height: 56,
            padding: '0 32px',
            fontSize: '1.1rem',
            fontWeight: 500,
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #7b1fa2 0%, #0097a7 100%)',
              boxShadow: '0 6px 25px rgba(138, 43, 226, 0.4)',
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(0, 188, 212, 0.3) 100%)',
              color: 'rgba(255, 255, 255, 0.5)',
              boxShadow: '0 2px 8px rgba(138, 43, 226, 0.1)',
              transform: 'none',
              border: '1px solid rgba(138, 43, 226, 0.2)'
            }
          }}
        >
          Ingest Records
        </Button>
      )}
    </>
  );
}