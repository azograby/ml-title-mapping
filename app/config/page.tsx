'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup, Grid, TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ConfigurationService } from '../../services/configuration';
import { CommonUtils } from '../../amplify/utils';
import { useSelector, useDispatch } from 'react-redux';
import { ISearchConfigStateReducer } from '../../store/search-config';
import { searchConfigStoreActions } from '../../store/search-config';

type FieldType = 'vector' | 'boost' | 'none';

interface FieldConfig {
  [key: string]: FieldType;
}

interface VectorConfig {
  minScore: number;
  weight: number;
}

interface BoostConfig {
  boost: number;
  weight: number;
}

export default function ConfigPage() {
  const titleFields = [
    'mamUUID', 'contentType', 'status', 'region', 'partner', 'partnerID', 
    'title', 'language', 'eidr', 'imdb', 'genre', 'subgenre', 'category', 
    'subcategory', 'releaseDate', 'duration', 'productionCountry', 
    'productionYear', 'productionCompany', 'rating', 'ratingDescriptors', 
    'producers', 'directors', 'writers', 'actors', 'shortDescription', 
    'longDescription'
  ];

  const [fieldConfig, setFieldConfig] = useState<FieldConfig>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: 'none' }), {})
  );
  
  const [vectorConfigs, setVectorConfigs] = useState<{ [key: string]: VectorConfig }>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: { minScore: 0.0, weight: 1.0 } }), {})
  );
  
  const [boostConfigs, setBoostConfigs] = useState<{ [key: string]: BoostConfig }>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: { boost: 1.0, weight: 1.0 } }), {})
  );
  
  const [maxResults, setMaxResults] = useState<number>(10);
  const [saving, setSaving] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  
  const configService = new ConfigurationService();
  const searchConfig = useSelector((state: ISearchConfigStateReducer) => state.searchConfigReducer.config);
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (searchConfig) {
      setMaxResults(searchConfig.size || 10);
      
      // Parse must queries (vector fields)
      const newFieldConfig: FieldConfig = titleFields.reduce((acc, field) => ({ ...acc, [field]: 'none' }), {});
      const newVectorConfigs: { [key: string]: VectorConfig } = {};
      const newBoostConfigs: { [key: string]: BoostConfig } = {};
      
      searchConfig.query?.bool?.must?.forEach((mustQuery: any) => {
        const knnField = Object.keys(mustQuery.function_score.query.knn)[0];
        const fieldName = knnField.replace('-embedding', '');
        if (titleFields.includes(fieldName)) {
          newFieldConfig[fieldName] = 'vector';
          newVectorConfigs[fieldName] = {
            minScore: parseFloat(mustQuery.function_score.query.knn[knnField].min_score) || 0,
            weight: mustQuery.function_score.weight || 1
          };
        }
      });
      
      // Parse should queries (boost fields)
      searchConfig.query?.bool?.should?.forEach((shouldQuery: any) => {
        const matchField = Object.keys(shouldQuery.function_score.query.match)[0];
        if (titleFields.includes(matchField)) {
          newFieldConfig[matchField] = 'boost';
          newBoostConfigs[matchField] = {
            boost: shouldQuery.function_score.boost || 1,
            weight: shouldQuery.function_score.weight || 1
          };
        }
      });
      
      setFieldConfig(newFieldConfig);
      setVectorConfigs(prev => ({ ...prev, ...newVectorConfigs }));
      setBoostConfigs(prev => ({ ...prev, ...newBoostConfigs }));
    }
  }, [searchConfig]);

  const handleFieldChange = (field: string, value: FieldType | null) => {
    if (value) {
      setFieldConfig(prev => ({ ...prev, [field]: value }));
      if (value !== 'vector') {
        setVectorConfigs(prev => ({
          ...prev,
          [field]: { minScore: 0.0, weight: 1.0 }
        }));
      }
      if (value !== 'boost') {
        setBoostConfigs(prev => ({
          ...prev,
          [field]: { boost: 1.0, weight: 1.0 }
        }));
      }
    }
  };

  const vectorFields = titleFields.filter(field => fieldConfig[field] === 'vector');
  const boostFields = titleFields.filter(field => fieldConfig[field] === 'boost');
  
  const generateOpenSearchQuery = () => {
    return CommonUtils.generateOpenSearchQuery(
      vectorFields,
      boostFields,
      vectorConfigs,
      boostConfigs,
      maxResults
    );
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const searchQuery = generateOpenSearchQuery();
      await configService.saveSearchConfig(searchQuery);
      setSnackbar({ open: true, message: 'Configuration saved successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error saving configuration', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetToDefault = () => {
    setConfirmReset(true);
  };
  
  const handleConfirmReset = async () => {
    setConfirmReset(false);
    try {
      await configService.deleteCustomSearchConfig();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting CUSTOM search configuration', severity: 'error' });
      return;
    }

    try {
      const defaultConfig = await configService.getDefaultSearchConfig();
      dispatch(searchConfigStoreActions.setSearchConfig(defaultConfig));
      setSnackbar({ open: true, message: 'Using DEFAULT search configuration file', severity: 'success' });
    } catch(error) {
      setSnackbar({ open: true, message: 'Error resetting to default search configuration', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Similarity Search Configuration
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Vector Fields ({vectorFields.length})
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              Vector fields are required to meet the minimum search values for "Min Score" to be included in the results. These are hard cutoffs.
            </Typography>
            {vectorFields.map(field => (
              <Typography key={field} variant="body2" sx={{ ml: 2 }}>
                • {field}
              </Typography>
            ))}
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="secondary">
              Boost Fields ({boostFields.length})
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              Boost fields are fields that you should not rely on for similarity, but if they exist, they will be scored higher in accordance with the Boost and Weight values.
            </Typography>
            {boostFields.map(field => (
              <Typography key={field} variant="body2" sx={{ ml: 2 }}>
                • {field}
              </Typography>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Configuration
        </Typography>
        <TextField
          label="Max Results"
          type="number"
          value={maxResults}
          onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
          inputProps={{ min: 1, step: 1 }}
          sx={{ width: 150 }}
        />
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Field Configuration
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {titleFields.map(field => (
            <Box key={field} sx={{ width: 'calc(50% - 8px)', minWidth: 400, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ minWidth: 140, textAlign: 'left' }}>
                  {field}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToggleButtonGroup
                    value={fieldConfig[field]}
                    exclusive
                    onChange={(_, value) => handleFieldChange(field, value)}
                    size="small"
                  >
                    <ToggleButton value="vector" color="primary">
                      Vector
                    </ToggleButton>
                    <ToggleButton value="boost" color="secondary">
                      Boost
                    </ToggleButton>
                    <ToggleButton value="none">
                      None
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {fieldConfig[field] === 'vector' && (
                    <>
                      <TextField
                        label="Min Score"
                        type="number"
                        size="small"
                        value={vectorConfigs[field].minScore}
                        onChange={(e) => setVectorConfigs(prev => ({
                          ...prev,
                          [field]: { ...prev[field], minScore: parseFloat(e.target.value) || 0 }
                        }))}
                        inputProps={{ step: 0.1 }}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        label="Weight"
                        type="number"
                        size="small"
                        value={vectorConfigs[field].weight}
                        onChange={(e) => setVectorConfigs(prev => ({
                          ...prev,
                          [field]: { ...prev[field], weight: parseFloat(e.target.value) || 1 }
                        }))}
                        inputProps={{ step: 0.1 }}
                        sx={{ width: 80 }}
                      />
                    </>
                  )}
                  {fieldConfig[field] === 'boost' && (
                    <>
                      <TextField
                        label="Boost"
                        type="number"
                        size="small"
                        value={boostConfigs[field].boost}
                        onChange={(e) => setBoostConfigs(prev => ({
                          ...prev,
                          [field]: { ...prev[field], boost: parseFloat(e.target.value) || 1 }
                        }))}
                        inputProps={{ step: 0.1 }}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        label="Weight"
                        type="number"
                        size="small"
                        value={boostConfigs[field].weight}
                        onChange={(e) => setBoostConfigs(prev => ({
                          ...prev,
                          [field]: { ...prev[field], weight: parseFloat(e.target.value) || 1 }
                        }))}
                        inputProps={{ step: 0.1 }}
                        sx={{ width: 80 }}
                      />
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Amazon OpenSearch Query
        </Typography>
        <Box sx={{ backgroundColor: '#1e1e1e', p: 2, borderRadius: 1, overflow: 'auto' }}>
          <pre style={{ margin: 0, fontSize: '12px', color: '#e0e0e0' }}>
            {JSON.stringify(generateOpenSearchQuery(), null, 2)}
          </pre>
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleResetToDefault}
          size="large"
        >
          Reset to Default
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={saving}
          size="large"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Reset Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset all configurations to default values? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button onClick={handleConfirmReset} color="primary" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}