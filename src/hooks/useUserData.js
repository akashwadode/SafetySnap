import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

function useUserData() {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsername = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUsername(userDoc.data().username);
          } else {
            setUsername('Unknown User'); // Fallback if document doesn't exist
          }
        } catch (err) {
          console.error('Firestore error:', err);
          setError(err.message);
          setUsername('Guest'); // Fallback for errors
        }
      }
      setLoading(false);
    };
    fetchUsername();
  }, [user]);

  return { user, username, loading, error };
}

export default useUserData;