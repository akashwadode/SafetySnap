import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import useUserData from '../hooks/useUserData';
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function Navbar() {
  const { user, username, loading, error } = useUserData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
            <Box display="flex" alignItems="center">
              <HomeIcon sx={{ mr: 1 }} />
              The Guardian Eye
            </Box>
          </Link>
        </Typography>
        <Box>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          {user && !loading && (
            <>
              <Button color="inherit" component={Link} to="/upload">
                Upload
              </Button>
              <Button color="inherit" component={Link} to="/history">
                History
              </Button>
            </>
          )}
          {user && !loading ? (
            <>
              <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                <Avatar sx={{ bgcolor: 'white', color: '#1976d2', mr: 1 }}>
                  <AccountCircleIcon />
                </Avatar>
                <Typography variant="body1">{username || 'Guest'}</Typography>
              </Box>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/signup">
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