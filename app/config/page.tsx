'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup, Grid, TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ConfigurationService } from '../../services/configuration';
import { CommonUtils } from '../../amplify/utils';
import { useSelector, useDispatch } from 'react-redux';
import { ISearchConfigStateReducer } from '../../store/search-config';
import { searchConfigStoreActions } from '../../store/search-config';

type FieldType = 'vector' | 'exact' | 'none';
type PlacementType = 'must' | 'should';

interface FieldConfig {
  [key: string]: FieldType;
}

interface FieldPlacement {
  [key: string]: PlacementType;
}

interface VectorConfig {
  minScore: number;
  weight: number;
}

interface ExactConfig {
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
  
  const [fieldPlacement, setFieldPlacement] = useState<FieldPlacement>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: 'must' }), {})
  );
  
  const [vectorConfigs, setVectorConfigs] = useState<{ [key: string]: VectorConfig }>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: { minScore: 0.0, weight: 1.0 } }), {})
  );
  
  const [exactConfigs, setExactConfigs] = useState<{ [key: string]: ExactConfig }>(
    titleFields.reduce((acc, field) => ({ ...acc, [field]: { weight: 1.0 } }), {})
  );
  
  const [maxResults, setMaxResults] = useState<number>(10);
  const [explain, setExplain] = useState<boolean>(false);
  const [minOptionalFieldMatches, setMinOptionalFieldMatches] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  
  const configService = new ConfigurationService();
  const searchConfig = useSelector((state: ISearchConfigStateReducer) => state.searchConfigReducer.config);
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (searchConfig) {
      setMaxResults(searchConfig.size || 10);
      setExplain(searchConfig.explain || false);
      setMinOptionalFieldMatches(parseInt(searchConfig.query?.bool?.minimum_should_match) || 0);
      
      const newFieldConfig: FieldConfig = titleFields.reduce((acc, field) => ({ ...acc, [field]: 'none' }), {});
      const newFieldPlacement: FieldPlacement = titleFields.reduce((acc, field) => ({ ...acc, [field]: 'must' }), {});
      const newVectorConfigs: { [key: string]: VectorConfig } = {};
      const newExactConfigs: { [key: string]: ExactConfig } = {};
      
      // Parse must and should queries
      ['must', 'should'].forEach(queryType => {
        searchConfig.query?.bool?.[queryType]?.forEach((query: any) => {
          if (query.function_score?.query?.knn) {
            const knnField = Object.keys(query.function_score.query.knn)[0];
            const fieldName = knnField.replace('Embedding', '');
            if (titleFields.includes(fieldName)) {
              newFieldConfig[fieldName] = 'vector';
              newFieldPlacement[fieldName] = queryType as PlacementType;
              newVectorConfigs[fieldName] = {
                minScore: parseFloat(query.function_score.query.knn[knnField].min_score) || 0,
                weight: query.function_score.weight || 1
              };
            }
          } else if (query.function_score?.query?.term) {
            const termField = Object.keys(query.function_score.query.term)[0];
            if (titleFields.includes(termField)) {
              newFieldConfig[termField] = 'exact';
              newFieldPlacement[termField] = queryType as PlacementType;
              newExactConfigs[termField] = {
                weight: query.function_score.weight || 1
              };
            }
          }
        });
      });
      
      setFieldConfig(newFieldConfig);
      setFieldPlacement(newFieldPlacement);
      setVectorConfigs(prev => ({ ...prev, ...newVectorConfigs }));
      setExactConfigs(prev => ({ ...prev, ...newExactConfigs }));
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
      if (value !== 'exact') {
        setExactConfigs(prev => ({
          ...prev,
          [field]: { weight: 1.0 }
        }));
      }
    }
  };

  const vectorFields = titleFields.filter(field => fieldConfig[field] === 'vector');
  const exactFields = titleFields.filter(field => fieldConfig[field] === 'exact');
  
  const generateOpenSearchQuery = () => {
    const mustQueries: any[] = [];
    const shouldQueries: any[] = [];
    
    // Add vector fields
    vectorFields.forEach(field => {
      const query = {
        function_score: {
          query: {
            knn: {
              [`${field}Embedding`]: {
                vector: `${field}Embedding`,
                min_score: vectorConfigs[field].minScore.toString()
              }
            }
          },
          weight: vectorConfigs[field].weight
        }
      };
      
      if (fieldPlacement[field] === 'must') {
        mustQueries.push(query);
      } else {
        shouldQueries.push(query);
      }
    });
    
    // Add exact fields
    exactFields.forEach(field => {
      const query = {
        function_score: {
          query: {
            term: { [field]: field }
          },
          weight: exactConfigs[field].weight
        }
      };
      
      if (fieldPlacement[field] === 'must') {
        mustQueries.push(query);
      } else {
        shouldQueries.push(query);
      }
    });
    
    return {
      size: maxResults,
      explain: explain,
      query: {
        bool: {
          minimum_should_match: minOptionalFieldMatches.toString(),
          must: mustQueries,
          should: shouldQueries
        }
      }
    };
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
        Title Similarity Search Configuration
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Vector Fields ({vectorFields.length})
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              Vector fields use embeddings to perform similarity search using k-NN. Vector fields must meet the "minimum similarity score" value to be included in the results. Records that are matched will have their score multiplied by the "Weight" field.
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
              Exact Fields ({exactFields.length})
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              Exact fields perform keyword matching that must match EXACTLY (case-sensitive) to be included in the results. Records that are matched will have their score multiplied by the "Weight" field.
            </Typography>
            {exactFields.map(field => (
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
        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
          Configure global search parameters including maximum results to return, set a minimum number of optional fields to match before returning a result, and request explanations of how the results were determined.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Max Results"
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
            inputProps={{ min: 1, step: 1 }}
            sx={{ width: 150 }}
          />
          <TextField
            label="Min. Optional Field Matches"
            type="number"
            value={minOptionalFieldMatches}
            onChange={(e) => setMinOptionalFieldMatches(parseInt(e.target.value) || 0)}
            inputProps={{ min: 0, step: 1 }}
            sx={{ width: 200 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="explain"
              checked={explain}
              onChange={(e) => setExplain(e.target.checked)}
            />
            <label htmlFor="explain" style={{ marginLeft: 8 }}>Explain Search Results</label>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Field Configuration
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
          Configure each field's search type (Vector, Exact, or None), and determine if that field has to match (Required) to be included in the results, or does not (Optional).
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
                    <ToggleButton value="exact" color="secondary">
                      Exact
                    </ToggleButton>
                    <ToggleButton value="none">
                      None
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {(fieldConfig[field] === 'vector' || fieldConfig[field] === 'exact') && (
                    <ToggleButtonGroup
                      value={fieldPlacement[field]}
                      exclusive
                      onChange={(_, value) => value && setFieldPlacement(prev => ({ ...prev, [field]: value }))}
                      size="small"
                    >
                      <ToggleButton value="must">
                        Required
                      </ToggleButton>
                      <ToggleButton value="should">
                        Optional
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
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
                  {fieldConfig[field] === 'exact' && (
                    <TextField
                      label="Weight"
                      type="number"
                      size="small"
                      value={exactConfigs[field].weight}
                      onChange={(e) => setExactConfigs(prev => ({
                        ...prev,
                        [field]: { ...prev[field], weight: parseFloat(e.target.value) || 1 }
                      }))}
                      inputProps={{ step: 0.1 }}
                      sx={{ width: 80 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Amazon OpenSearch Query Template
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