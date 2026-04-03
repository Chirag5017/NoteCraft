import { useAppDispatch, useAppSelector, selectAuth } from '@/store';
import { logout, setCredentials } from '@/store/authSlice';
import { disconnectSocket } from '@/lib/socket';
import type { User } from '@/types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
  };

  const handleSetCredentials = (user: User, token: string) => {
    dispatch(setCredentials({ user, token }));
  };

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    logout: handleLogout,
    setCredentials: handleSetCredentials,
  };
}
