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
  Tooltip
} from '@mui/material';
import { listTitles } from '../../amplify/data/queries/titles';
import { ITitle } from '../../types/titles';

export default function MapperPage() {
  const [limit, setLimit] = useState(10);
  const [titles, setTitles] = useState<ITitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<ITitle | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleRowClick = (title: ITitle) => {
    setSelectedTitle(title);
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

      <Box sx={{ minHeight: '300px', mb: 3 }}>
        <TableContainer component={Paper} sx={{ minHeight: '300px', overflowX: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
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
      </Box>

      <Box sx={{ height: '45%' }}>
        {selectedTitle ? (
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Title Details
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxHeight: '100%', overflow: 'auto' }}>
                {Object.entries(selectedTitle).map(([key, value]) => (
                  <Box key={key}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                    </Typography>
                    <Typography variant="body2">{String(value)}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Select a row to view details
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}