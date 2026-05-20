import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAppDispatch, useAppSelector, selectToken, selectIsAuthenticated } from '@/store';
import { setOffline } from '@/store/uiSlice';

/**
 * Manages the Socket.IO connection lifecycle only.
 * Room joining/leaving is handled by useCollaboration.
 * This hook runs globally in App.tsx.
 */
export function useSocket() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    connectSocket(token);
    const socket = getSocket();

    const handleConnect = () => dispatch(setOffline(false));
    const handleDisconnect = () => dispatch(setOffline(true));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, token, dispatch]);

  return { disconnect: disconnectSocket };
}
