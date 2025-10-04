import { Box, Flex, Button, Heading, Link as ChakraLink } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

function Navbar() {
  const [user] = useAuthState(auth); // Check if user is logged in
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <Box bg="blue.600" p={4} color="white">
      <Flex maxW="1200px" mx="auto" align="center" justify="space-between">
        <Heading size="md">
          <ChakraLink as={Link} to="/" _hover={{ textDecoration: 'none' }}>
            PPE Detector
          </ChakraLink>
        </Heading>
        <Flex gap={4}>
          <ChakraLink as={Link} to="/" _hover={{ textDecoration: 'underline' }}>
            Home
          </ChakraLink>
          {user ? (
            <Button colorScheme="red" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <>
              <ChakraLink as={Link} to="/login" _hover={{ textDecoration: 'underline' }}>
                Login
              </ChakraLink>
              <ChakraLink as={Link} to="/signup" _hover={{ textDecoration: 'underline' }}>
                Signup
              </ChakraLink>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

export default Navbar;