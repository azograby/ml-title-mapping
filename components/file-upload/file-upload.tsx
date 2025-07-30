import * as React from "react";
import { AssetsService } from "../../services/assets";
import { useDispatch, useSelector } from 'react-redux';
import { IUserStateReducer } from "../../store/auth";
import { Box, Button, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

interface FileUploadProps {
  onUploadResult: (message: string, severity: 'success' | 'error') => void;
}

export default function FileUpload({ onUploadResult }: FileUploadProps) {
  const currentUser = useSelector((state: IUserStateReducer) => {
    return state.authReducer.user;
  });

  const dispatch = useDispatch();
  const svc = new AssetsService();
  
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const excelFiles = selectedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    setFiles(excelFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const results = await svc.uploadFiles(files);
      const errors = results.filter((r) => r.status === 'failed');
      const successful = results.filter((r) => r.status === 'success');
      
      if (errors.length > 0) {
        onUploadResult(`${errors.length} file(s) failed to upload`, 'error');
      } else {
        onUploadResult(`${successful.length} file(s) uploaded successfully`, 'success');
        setFiles([]);
      }
    } catch (error) {
      onUploadResult('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Excel Files
      </Typography>
      
      <Box sx={{ mb: 2 }}>
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
            sx={{ mr: 2 }}
          >
            Select Excel Files
          </Button>
        </label>
        
        <Button
          variant="contained"
          onClick={uploadFiles}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </Box>

      {files.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files:
          </Typography>
          <List dense>
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText primary={file.name} secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
}