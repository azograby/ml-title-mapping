'use client';

import { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, IconButton, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IndexService } from '../../services/index';
import { AuthService } from '../../services/auth';

interface IndexDropdownProps {
  selectedIndex: string;
  onIndexChange: (index: string) => void;
  onError?: (message: string) => void;
}

export default function IndexDropdown({ selectedIndex, onIndexChange, onError }: IndexDropdownProps) {
  const [indexes, setIndexes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const indexService = new IndexService();

  const STORAGE_KEY = 'ml-item-mapping-selected-index';

  const loadIndexes = async () => {
    setLoading(true);
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        onError?.('Failed to get user');
        return;
      }
      const indexList = await indexService.getAllIndexes(user.userId);
      setIndexes(indexList);
    } catch (error) {
      onError?.('Failed to load indexes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndexes();
    // Load persisted index from localStorage
    const savedIndex = localStorage.getItem(STORAGE_KEY);
    if (savedIndex && !selectedIndex) {
      onIndexChange(savedIndex);
    }
  }, []);

  const handleIndexChange = (event: any) => {
    const newIndex = event.target.value;
    localStorage.setItem(STORAGE_KEY, newIndex);
    onIndexChange(newIndex);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FormControl sx={{ minWidth: 300 }}>
        <InputLabel>Select Index</InputLabel>
        <Select
          value={selectedIndex}
          label="Select Index"
          onChange={handleIndexChange}
          disabled={loading}
        >
          {indexes.map((index) => (
            <MenuItem key={index} value={index}>
              {index}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <IconButton 
        onClick={loadIndexes}
        disabled={loading}
        sx={{ 
          border: '1px solid rgba(0, 0, 0, 0.23)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <RefreshIcon />
      </IconButton>
    </Box>
  );
}