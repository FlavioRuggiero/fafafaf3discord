import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento...</div>;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};