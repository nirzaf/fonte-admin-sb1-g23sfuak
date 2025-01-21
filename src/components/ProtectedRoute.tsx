import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - session:', session, 'loading:', loading);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    console.log('No session, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('Session exists, rendering children');
  return <>{children}</>;
}