import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'user')[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export function ProtectedRoute({
  allowedRoles,
  redirectTo = '/auth/login',
  children
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAuthorized(false);
          return;
        }

        // Vérifier le rôle de l'utilisateur
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!allowedRoles || (userData?.role && allowedRoles.includes(userData.role))) {
          setIsAuthorized(true);
        } else {
          toast.error('Accès non autorisé');
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthorized ? children || <Outlet /> : <Navigate to={redirectTo} replace />;
}