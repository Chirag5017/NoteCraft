import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LandingPage } from '@/pages/LandingPage';
import { SharedNotePage } from '@/pages/SharedNotePage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { NoteEditorPage } from '@/pages/NoteEditorPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SearchModal } from '@/components/search/SearchModal';
import { OfflineBanner } from '@/components/sync/OfflineBanner';
import { ConflictModal } from '@/components/sync/ConflictModal';
import { useAppSelector, selectIsDarkMode, selectIsAuthenticated } from '@/store';
import { useAppDispatch } from '@/store';
import { setToken, setUser } from '@/store/authSlice';
import { useGetMeQuery } from '@/store/api';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useSocket } from '@/hooks/useSocket';

/** Redirect authenticated users away from login/signup back to landing page */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Restore session from token on every page load */
function SessionRestorer() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(state => state.auth.token);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const { data: user } = useGetMeQuery(undefined, {
    skip: !token || isAuthenticated,
  });

  useEffect(() => {
    if (user) dispatch(setUser(user));
  }, [user, dispatch]);

  return null;
}

/** Capture the JWT returned from the backend Google OAuth callback */
function OAuthTokenHandler() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    dispatch(setToken(token));
    params.delete('token');

    const nextSearch = params.toString();
    const nextUrl = `/dashboard${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }, [dispatch]);

  return null;
}

function AppContent() {
  const isDarkMode = useAppSelector(selectIsDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useOfflineSync();
  useSocket();

  return (
    <ErrorBoundary>
      <OAuthTokenHandler />
      <SessionRestorer />
      <OfflineBanner />
      <Routes>
        {/* Public routes — redirect to / if already logged in */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/workspace/:id"
          element={
            <AuthGuard>
              <WorkspacePage />
            </AuthGuard>
          }
        />
        <Route
          path="/workspace/:id/note/:noteId"
          element={
            <AuthGuard>
              <NoteEditorPage />
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          }
        />

        {/* Landing page — public */}
        <Route path="/" element={<LandingPage />} />

        {/* Public shared note — no auth required */}
        <Route path="/shared/:token" element={<SharedNotePage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global overlays */}
      <SearchModal />
      <ConflictModal />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-gray-100',
          duration: 4000,
        }}
      />
    </ErrorBoundary>
  );
}

export function App() {
  return <AppContent />;
}
