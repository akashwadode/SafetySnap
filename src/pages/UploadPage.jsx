import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { auth } from '../firebase';
import { Container, Typography, Box, Button, Alert, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && (uploadedFile.type.startsWith('image/') || uploadedFile.type.startsWith('video/'))) {
      setFile(uploadedFile);
      setPreview(URL.createObjectURL(uploadedFile));
      setError('');
      setResult(null);
    } else {
      setError('Please upload an image (JPEG/PNG) or video (MP4, AVI).');
      setFile(null);
      setPreview(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) {
      setError('No file selected.');
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setResult(null);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Image or Video
      </Typography>
      <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed #1976d2',
            p: 4,
            bgcolor: isDragActive ? '#e3f2fd' : 'white',
            cursor: 'pointer',
            borderRadius: '8px'
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2' }} />
          <Typography variant="body1">
            {isDragActive ? 'Drop the file here' : 'Drag & drop an image or video, or click to select'}
          </Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {preview && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Preview</Typography>
            {file.type.startsWith('image/') ? (
              <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} />
            ) : (
              <video src={preview} controls style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }} />
            )}
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file}
          sx={{ mt: 2 }}
        >
          Upload
        </Button>
      </Paper>
      {result && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Detection Results</Typography>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Box>
      )}
    </Container>
  );
}

export default UploadPage;