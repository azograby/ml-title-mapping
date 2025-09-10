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
import { listTitles } from '../../amplify/data/queries/titles';
import { ITitle, IFindRelatedTitlesResponse } from '../../types/titles';
import { TitleService } from '../../services/titles';
import { useSelector } from 'react-redux';
import { ISearchConfigStateReducer } from '../../store/search-config';

export default function MapperPage() {
  const [limit, setLimit] = useState(10);
  const [titles, setTitles] = useState<ITitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<ITitle | null>(null);
  const [relatedTitlesResponse, setRelatedTitlesResponse] = useState<IFindRelatedTitlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [findingRelated, setFindingRelated] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'error' | 'success' }>({ open: false, message: '', severity: 'success' });
  const searchConfig = useSelector((state: ISearchConfigStateReducer) => state.searchConfigReducer.config);

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

  const fetchTitles = async () => {
    setLoading(true);
    try {
      const data = await listTitles(limit);
      setTitles(data);
    } catch (error) {
      console.error('Error fetching titles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (title: ITitle) => {
    setSelectedTitle(title);
    setFindingRelated(true);
    try {
      const request = {
        ...title,
        opensearchQuery: searchConfig
      };
      const response = await TitleService.findRelatedTitles(request);
      setRelatedTitlesResponse(response);
      console.log('Related titles:', response);
    } catch (error) {
      console.error('Error finding related titles:', error);
      setRelatedTitlesResponse(null);
      setNotification({ open: true, message: `Error finding related titles. ${error}.`, severity: 'error' });
    } finally {
      setFindingRelated(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 120px)' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Title Mapper
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Limit"
          type="number"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          size="small"
          sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={fetchTitles} disabled={loading}>
          {loading ? 'Loading...' : 'Get Titles'}
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Titles Remaining to be Processed
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>MAM UUID</TableCell>
                <TableCell>Content Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Partner</TableCell>
                <TableCell>Partner ID</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Title</TableCell>
                <TableCell>Language</TableCell>
                <TableCell>EIDR</TableCell>
                <TableCell>IMDB</TableCell>
                <TableCell>Genre</TableCell>
                <TableCell>Subgenre</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Category</TableCell>
                <TableCell>Subcategory</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Release Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Production Country</TableCell>
                <TableCell>Production Year</TableCell>
                <TableCell>Production Company</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Rating Descriptors</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Producers</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Directors</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Writers</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Actors</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Short Description</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Long Description</TableCell>
                {/* <TableCell>Created At</TableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {titles.map((title) => (
                <TableRow
                  key={title.mamUUID}
                  hover
                  onClick={() => handleRowClick(title)}
                  sx={{ cursor: 'pointer', height: '30px' }}
                >
                  <TruncatedCell value={title.mamUUID} sx={{ minWidth: 150 }} />
                  <TruncatedCell value={title.contentType} />
                  <TruncatedCell value={title.status} />
                  <TruncatedCell value={title.region} />
                  <TruncatedCell value={title.partner} />
                  <TruncatedCell value={title.partnerID} />
                  <TruncatedCell value={title.title} sx={{ minWidth: 200 }} />
                  <TruncatedCell value={title.language} />
                  <TruncatedCell value={title.eidr} />
                  <TruncatedCell value={title.imdb} />
                  <TruncatedCell value={title.genre} />
                  <TruncatedCell value={title.subgenre} />
                  <TruncatedCell value={title.category} sx={{ minWidth: 120 }} />
                  <TruncatedCell value={title.subcategory} />
                  <TruncatedCell value={title.releaseDate} sx={{ minWidth: 120 }} />
                  <TruncatedCell value={String(title.duration)} />
                  <TruncatedCell value={title.productionCountry} />
                  <TruncatedCell value={String(title.productionYear)} />
                  <TruncatedCell value={title.productionCompany} />
                  <TruncatedCell value={title.rating} />
                  <TruncatedCell value={title.ratingDescriptors} />
                  <TruncatedCell value={title.producers} />
                  <TruncatedCell value={title.directors} sx={{ minWidth: 150 }} />
                  <TruncatedCell value={title.writers} sx={{ minWidth: 150 }} />
                  <TruncatedCell value={title.actors} sx={{ minWidth: 150 }} />
                  <TruncatedCell value={title.shortDescription} sx={{ minWidth: 200 }} />
                  <TruncatedCell value={title.longDescription} sx={{ minWidth: 200 }} />
                  {/* <TruncatedCell value={title.createdAt} /> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Box>
        {relatedTitlesResponse ? (
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Related Title Results
              </Typography>
              {relatedTitlesResponse.titles.length > 0 ? (
                <>
                  <Box sx={{ mb: 2, display: 'flex', gap: 4 }}>
                    <Typography variant="body1">
                      <strong>Total Results:</strong> {relatedTitlesResponse.totalResults}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Max Score:</strong> {relatedTitlesResponse.maxScore.toFixed(3)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Showing Top {relatedTitlesResponse.titles.length} Results</strong>
                    </Typography>
                  </Box>
                <TableContainer component={Paper} sx={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Score</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>MAM UUID</TableCell>
                        <TableCell>Content Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Partner</TableCell>
                        <TableCell>Partner ID</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>Title</TableCell>
                        <TableCell>Language</TableCell>
                        <TableCell>EIDR</TableCell>
                        <TableCell>IMDB</TableCell>
                        <TableCell>Genre</TableCell>
                        <TableCell>Subgenre</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Category</TableCell>
                        <TableCell>Subcategory</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Release Date</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Production Country</TableCell>
                        <TableCell>Production Year</TableCell>
                        <TableCell>Production Company</TableCell>
                        <TableCell>Rating</TableCell>
                        <TableCell>Rating Descriptors</TableCell>
                        <TableCell>Producers</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Directors</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Writers</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Actors</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>Short Description</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>Long Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedTitlesResponse.titles.map((relatedTitle, index) => (
                        <TableRow key={index} sx={{ height: '30px' }}>
                          <TableCell sx={{ fontWeight: 'normal', fontSize: '1.4rem' }}>
                            {relatedTitle._score.toFixed(2)}
                          </TableCell>
                          <TruncatedCell value={relatedTitle._source.mamUUID} sx={{ minWidth: 150 }} />
                          <TruncatedCell value={relatedTitle._source.contentType} />
                          <TruncatedCell value={relatedTitle._source.status} />
                          <TruncatedCell value={relatedTitle._source.region} />
                          <TruncatedCell value={relatedTitle._source.partner} />
                          <TruncatedCell value={relatedTitle._source.partnerID} />
                          <TruncatedCell value={relatedTitle._source.title} sx={{ minWidth: 200 }} />
                          <TruncatedCell value={relatedTitle._source.language} />
                          <TruncatedCell value={relatedTitle._source.eidr} />
                          <TruncatedCell value={relatedTitle._source.imdb} />
                          <TruncatedCell value={relatedTitle._source.genre} />
                          <TruncatedCell value={relatedTitle._source.subgenre} />
                          <TruncatedCell value={relatedTitle._source.category} sx={{ minWidth: 120 }} />
                          <TruncatedCell value={relatedTitle._source.subcategory} />
                          <TruncatedCell value={relatedTitle._source.releaseDate} sx={{ minWidth: 120 }} />
                          <TruncatedCell value={String(relatedTitle._source.duration)} />
                          <TruncatedCell value={relatedTitle._source.productionCountry} />
                          <TruncatedCell value={String(relatedTitle._source.productionYear)} />
                          <TruncatedCell value={relatedTitle._source.productionCompany} />
                          <TruncatedCell value={relatedTitle._source.rating} />
                          <TruncatedCell value={relatedTitle._source.ratingDescriptors} />
                          <TruncatedCell value={relatedTitle._source.producers} />
                          <TruncatedCell value={relatedTitle._source.directors} sx={{ minWidth: 150 }} />
                          <TruncatedCell value={relatedTitle._source.writers} sx={{ minWidth: 150 }} />
                          <TruncatedCell value={relatedTitle._source.actors} sx={{ minWidth: 150 }} />
                          <TruncatedCell value={relatedTitle._source.shortDescription} sx={{ minWidth: 200 }} />
                          <TruncatedCell value={relatedTitle._source.longDescription} sx={{ minWidth: 200 }} />
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
              Select a row to find related titles
            </Typography>
          </Paper>
        )}
      </Box>
      
      <Backdrop open={loading || findingRelated} sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" color="white">
            {loading ? 'Loading titles...' : findingRelated ? 'Finding related titles...' : ''}
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