import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAppSelector, useAppDispatch, selectIsAuthenticated, selectToken } from '@/store';
import { setUser, setLoading } from '@/store/authSlice';
import { useGetMeQuery } from '@/store/api';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = useAppSelector(selectToken);

  // Try to restore session from token
  const { data: user, isLoading, isError } = useGetMeQuery(undefined, {
    skip: !token || isAuthenticated,
  });

  useEffect(() => {
    if (user) {
      dispatch(setUser(user));
    }
  }, [user, dispatch]);

  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Spinner size="lg" className="text-brand-500" />
      </div>
    );
  }

  if (!token || isError || (!isAuthenticated && !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
