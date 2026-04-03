import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4 page-transition">
      <div className="text-center">
        <FileQuestion className="h-20 w-20 text-gray-200 dark:text-gray-800 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">404</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Page not found</p>
        <p className="text-sm text-gray-400 dark:text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate(-1)} variant="secondary">
          Go back
        </Button>
      </div>
    </div>
  );
}
