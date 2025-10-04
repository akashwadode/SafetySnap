import { useState, useCallback, useRef, useEffect } from 'react';
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
  const canvasRef = useRef(null);
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

  useEffect(() => {
    if (result && preview && file?.type.startsWith('image/')) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = preview;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.font = '16px Arial';
        result.detections.forEach(({ label, confidence, bbox }) => {
          const [x_min, y_min, x_max, y_max] = bbox;
          ctx.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);
          ctx.fillStyle = 'red';
          ctx.fillText(`${label} (${(confidence * 100).toFixed(2)}%)`, x_min, y_min - 5);
        });
      };
    }
  }, [result, preview, file]);

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
            {file?.type.startsWith('image/') ? (
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '300px' }} />
              </Box>
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