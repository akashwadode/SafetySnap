import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { Container, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper, Button, TextField, Box, Pagination, Alert } from '@mui/material';
import useUserData from '../hooks/useUserData';

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [filenameFilter, setFilenameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [error, setError] = useState('');
  const { user, loading } = useUserData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const params = { page, per_page: perPage };
      if (filenameFilter) params.filename = filenameFilter;
      if (startDateFilter) params.start_date = startDateFilter;
      if (endDateFilter) params.end_date = endDateFilter;

      const response = await axios.get('http://localhost:8000/history', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setHistory(response.data.uploads);
      setTotalPages(response.data.total_pages);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch history.');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, page, filenameFilter, startDateFilter, endDateFilter]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload History
      </Typography>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            label="Filter by Filename"
            value={filenameFilter}
            onChange={(e) => setFilenameFilter(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="Start Date (YYYY-MM-DD)"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            variant="outlined"
            size="small"
          />
          <TextField
            label="End Date (YYYY-MM-DD)"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            variant="outlined"
            size="small"
          />
          <Button variant="contained" onClick={fetchHistory}>
            Apply Filters
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Filename</TableCell>
              <TableCell>Upload Time</TableCell>
              <TableCell>Detections</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((upload) => (
              <TableRow key={upload.upload_id}>
                <TableCell>{upload.upload_id}</TableCell>
                <TableCell>{upload.filename}</TableCell>
                <TableCell>{new Date(upload.upload_time).toLocaleString()}</TableCell>
                <TableCell>
                  <pre style={{ whiteSpace: 'pre-wrap', maxWidth: '400px' }}>
                    {JSON.stringify(upload.detections, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
        </Box>
      </Paper>
    </Container>
  );
}

export default HistoryPage;