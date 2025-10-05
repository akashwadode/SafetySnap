import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Container, Card, CardContent, Typography, TextField, Button, Alert, Box } from '@mui/material';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Store username in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        createdAt: new Date().toISOString()
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
      <Card sx={{ minWidth: 300, maxWidth: 400, bgcolor: '#e8f5e9' }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom color="green">
            Signup for SafetySnap
          </Typography>
          <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              variant="outlined"
              sx={{ bgcolor: 'white' }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" color="success" fullWidth>
              Signup
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default SignupPage;