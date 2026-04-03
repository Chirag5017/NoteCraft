import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleOAuthButton } from '@/components/auth/GoogleOAuthButton';
import { useAppSelector, selectIsAuthenticated } from '@/store';

export function LoginPage() {
  const navigate = useNavigate();
  // const isAuthenticated = useAppSelector(selectIsAuthenticated);
   const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 page-transition">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">NoteCraft</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-6">
          <LoginForm />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400 dark:text-gray-600">
                or
              </span>
            </div>
          </div>

          <GoogleOAuthButton />
        </div>
      </div>
    </div>
  );
}
