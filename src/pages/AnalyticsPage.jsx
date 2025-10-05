import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Paper,
} from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import useUserData from '../hooks/useUserData';
import '../styles/analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    total_uploads: 0,
    label_counts: {},
    daily_trends: {},
  });
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

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const params = {};
      if (startDateFilter) params.start_date = startDateFilter;
      if (endDateFilter) params.end_date = endDateFilter;

      const response = await axios.get('http://localhost:8000/analytics', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setAnalytics(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch analytics.');
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user, startDateFilter, endDateFilter]);

  // Bar chart data
  const barData = {
    labels: Object.keys(analytics.label_counts),
    datasets: [
      {
        label: 'Detection Counts',
        data: Object.values(analytics.label_counts),
        backgroundColor: 'rgba(25, 118, 210, 0.5)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Line chart data
  const lineData = {
    labels: Object.keys(analytics.daily_trends),
    datasets: Object.keys(analytics.label_counts).map((label, index) => ({
      label: label,
      data: Object.keys(analytics.daily_trends).map(
        (date) => analytics.daily_trends[date][label] || 0
      ),
      fill: false,
      borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
      tension: 0.1,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // allows custom height
    plugins: {
      legend: { position: 'top' },
    },
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        PPE Compliance Analytics
      </Typography>

      <Paper sx={{ p: 4, mb: 4 }}>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 12, mb: 4, flexWrap: 'wrap' }}>
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
          <Button variant="contained" onClick={fetchAnalytics}>
            Apply Filters
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="h6" className="total-uploads">
          Total Uploads: {analytics.total_uploads}
        </Typography>

        {/* Bar Chart */}
        <Box className="chart-container">
          <Typography variant="h5" className="chart-title">
            Detection Counts by Label
          </Typography>
          <Box sx={{ height: '100%' }}>
            <Bar
              data={barData}
              options={{
                ...chartOptions,
                plugins: { 
                  ...chartOptions.plugins, 
                  title: { display: true, text: 'Detections per Label' } 
                },
              }}
            />
          </Box>
        </Box>
              
        {/* Line Chart */}
        <Box className="chart-container">
          <Typography variant="h5" className="chart-title">
            Daily Detection Trends
          </Typography>
          <Box sx={{ height: '100%' }}>
            <Line
              data={lineData}
              options={{
                ...chartOptions,
                plugins: { 
                  ...chartOptions.plugins, 
                  title: { display: true, text: 'Daily Detection Trends' } 
                },
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default AnalyticsPage;
