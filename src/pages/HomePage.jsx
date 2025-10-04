import { Container, Typography, Box } from '@mui/material';

function HomePage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        PPE Detector
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body1">
          Welcome to the PPE Detector, a web application designed for real-time safety monitoring.
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
      </Box>
    </Container>
  );
}

export default HomePage;