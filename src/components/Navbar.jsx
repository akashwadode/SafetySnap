import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import useUserData from '../hooks/useUserData';
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import '../styles/navbar.css';

function Navbar() {
  const { user, username, loading } = useUserData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
      <Toolbar className="navbar-container">
        {/* Left side: Title + Links */}
        <Box className="navbar-left">
          <Typography variant="h6" className="navbar-title">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Box display="flex" alignItems="center">
                <HomeIcon sx={{ mr: 1 }} />
                SafetySnap
              </Box>
            </Link>
          </Typography>

          {/* Navigation links next to title */}
          <Box className="navbar-links">
            <Button color="inherit" component={Link} to="/" className="navbar-button">
              Home
            </Button>
            {user && !loading && (
              <>
                <Button color="inherit" component={Link} to="/upload" className="navbar-button">
                  Upload
                </Button>
                <Button color="inherit" component={Link} to="/history" className="navbar-button">
                  History
                </Button>
                <Button color="inherit" component={Link} to="/analytics" className="navbar-button">
                  Analytics
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Right side: User/Profile */}
        <Box className="navbar-profile">
          {user && !loading ? (
            <>
              <Box className="navbar-user">
                <Avatar className="navbar-avatar" sx={{ bgcolor: 'white', color: '#1976d2' }}>
                </Avatar>
                <Typography className="navbar-username">{username || 'Guest'}</Typography>
              </Box>
              <Button color="inherit" onClick={handleLogout} className="navbar-button">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login" className="navbar-button">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/signup" className="navbar-button">
                Signup
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
