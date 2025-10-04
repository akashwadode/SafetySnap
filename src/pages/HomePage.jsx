import { Container, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function HomePage() {
  const [user, loading] = useAuthState(auth);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        The Guardian Eye
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body1">
          Welcome to The Guardian Eye, a web application designed for real-time safety monitoring.
          Upload images or videos to automatically detect whether individuals are wearing Personal
          Protective Equipment (PPE) such as helmets and vests. The system provides visual results
          with overlayed bounding boxes and structured JSON metadata including labels, confidence
          scores, and coordinates.
        </Typography>
        <Typography variant="body1">
          View past uploads, filter by labels or dates, and explore analytics dashboards to track
          PPE compliance rates and detection trends. Ideal for workplace safety audits, our platform
          supports programmatic integration via a professional API with pagination, idempotency,
          and rate limiting. Get started by signing up or logging in!
        </Typography>
        {!loading && user && (
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/upload"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2, width: 'fit-content' }}
          >
            Upload Now
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default HomePage;