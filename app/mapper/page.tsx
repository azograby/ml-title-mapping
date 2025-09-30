'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop
} from '@mui/material';
import { IItem, IFindRelatedItemsResponse } from '../../types/items';
import { ItemsService } from '../../services/items';
import { useSelector } from 'react-redux';
import { ISearchConfigStateReducer } from '../../store/search-config';
import IndexDropdown from '../../components/index-dropdown/index-dropdown';
import { ConfigurationService } from '../../services/configuration';

export default function MapperPage() {
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [relatedItemsResponse, setRelatedItemsResponse] = useState<IFindRelatedItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [findingRelated, setFindingRelated] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'error' | 'success' }>({ open: false, message: '', severity: 'success' });
  const [selectedIndex, setSelectedIndex] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ml-item-mapping-selected-index') || '';
    }
    return '';
  });
  const [columns, setColumns] = useState<string[]>([]);
  const [indexConfig, setIndexConfig] = useState<any>(null);
  const searchConfig = useSelector((state: ISearchConfigStateReducer) => state.searchConfigReducer.config);
  const configService = new ConfigurationService();

  const TruncatedCell = ({ value, sx }: { value: string; sx?: any }) => {
    const displayValue = value?.length > 50 ? value.substring(0, 50) + '...' : value;
    return (
      <TableCell sx={sx}>
        <Tooltip title={value} arrow>
          <span>{displayValue}</span>
        </Tooltip>
      </TableCell>
    );
  };

  const fetchItems = async () => {
    if (!selectedIndex) {
      setNotification({ open: true, message: 'Please select an index first', severity: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const [data, config] = await Promise.all([
        ItemsService.getItemsByIndex(selectedIndex, limit),
        configService.getFullIndexConfig(selectedIndex)
      ]);
      
      setItems(data);
      setIndexConfig(config);
      
      // Extract columns from the first item
      if (data.length > 0) {
        const itemKeys = Object.keys(data[0]).filter(key => 
          !['indexName', 'createdAt', 'updatedAt', 'id'].includes(key)
        );
        setColumns(itemKeys);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setNotification({ open: true, message: 'Error fetching items', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleIndexChange = (index: string) => {
    setSelectedIndex(index);
    setItems([]);
    setColumns([]);
    setIndexConfig(null);
    setSelectedItem(null);
    setRelatedItemsResponse(null);
  };

  const getColumnHeaderStyle = (column: string) => {
    if (!indexConfig) return {};
    
    const normalizedColumn = column.replace(/\s+/g, '').toLowerCase();
    const vectorFields = (indexConfig.vectorFieldList || []).map((field: string) => field.replace(/\s+/g, '').toLowerCase());
    const exactFields = (indexConfig.exactFieldList || []).map((field: string) => field.replace(/\s+/g, '').toLowerCase());
    
    if (vectorFields.includes(normalizedColumn)) {
      return { color: '#1976d2', fontWeight: 'bold' }; // Blue for vector fields
    }
    
    if (exactFields.includes(normalizedColumn)) {
      return { color: '#2e7d32', fontWeight: 'bold' }; // Green for exact fields
    }
    
    return {};
  };

  const handleRowClick = async (item: IItem) => {
    setSelectedItem(item);
    setFindingRelated(true);
    try {
      const indexConfig = await configService.getFullIndexConfig(selectedIndex);
      const request = {
        ...item,
        indexName: selectedIndex,
        opensearchQuery: indexConfig
      };
      const response = await ItemsService.findRelatedItems(request);
      setRelatedItemsResponse(response);
      console.log('Related items:', response);
    } catch (error) {
      console.error('Error finding related items:', error);
      setRelatedItemsResponse(null);
      setNotification({ open: true, message: `Error finding related items. ${error}.`, severity: 'error' });
    } finally {
      setFindingRelated(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 120px)' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Item Mapper
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IndexDropdown 
            selectedIndex={selectedIndex}
            onIndexChange={handleIndexChange}
            onError={(message) => setNotification({ open: true, message, severity: 'error' })}
          />
          <TextField
            label="Limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            size="small"
            sx={{ width: 120 }}
          />
          <Button variant="contained" onClick={fetchItems} disabled={loading || !selectedIndex}>
            {loading ? 'Loading...' : 'Get Items'}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body1" sx={{ color: '#1976d2', fontWeight: 'bold' }}>● Vector Fields</Typography>
          <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>● Exact Fields</Typography>
          <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold' }}>● Not used for similarity</Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Items Remaining to be Processed
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column} sx={{ minWidth: 200, ...getColumnHeaderStyle(column) }}>
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={item.id || index}
                  hover
                  onClick={() => handleRowClick(item)}
                  sx={{ cursor: 'pointer', height: '30px' }}
                >
                  {columns.map((column) => (
                    <TruncatedCell 
                      key={column} 
                      value={String((item as any)[column] || '')} 
                      sx={{ minWidth: 200 }} 
                    />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Box>
        {relatedItemsResponse ? (
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Related Item Results
              </Typography>
              {relatedItemsResponse.items.length > 0 ? (
                <>
                  <Box sx={{ mb: 2, display: 'flex', gap: 4 }}>
                    <Typography variant="body1">
                      <strong>Total Results:</strong> {relatedItemsResponse.totalResults}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Max Score:</strong> {relatedItemsResponse.maxScore.toFixed(3)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Showing Top {relatedItemsResponse.items.length} Results</strong>
                    </Typography>
                  </Box>
                <TableContainer component={Paper} sx={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 200 }}>Score</TableCell>
                        {columns.map((column) => (
                          <TableCell key={column} sx={{ minWidth: 200, ...getColumnHeaderStyle(column) }}>
                            {column}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedItemsResponse.items.map((relatedItem, index) => (
                        <TableRow key={index} sx={{ height: '30px' }}>
                          <TableCell sx={{ fontWeight: 'normal', fontSize: '1.4rem', minWidth: 200 }}>
                            {relatedItem._score.toFixed(2)}
                          </TableCell>
                          {columns.map((column) => (
                            <TruncatedCell 
                              key={column} 
                              value={String((relatedItem._source as any)[column] || '')} 
                              sx={{ minWidth: 200 }} 
                            />
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No results were found
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          <Paper sx={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a row to find related items
            </Typography>
          </Paper>
        )}
      </Box>
      
      <Backdrop open={loading || findingRelated} sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" color="white">
            {loading ? 'Loading items...' : findingRelated ? 'Finding related items...' : ''}
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
    </Container>
  );
}