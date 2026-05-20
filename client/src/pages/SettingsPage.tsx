import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLayout } from '@/components/layout/PageLayout';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAppDispatch, useAppSelector, selectUser, selectIsDarkMode } from '@/store';
import { toggleDarkMode } from '@/store/uiSlice';
import { logout } from '@/store/authSlice';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const isDarkMode = useAppSelector(selectIsDarkMode);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    // In a real app, call updateProfile mutation
    toast.success(`Name updated to ${data.name}`);
  };

  const onPasswordSubmit = async (_data: PasswordFormData) => {
    // In a real app, call changePassword mutation
    toast.success('Password updated');
    passwordForm.reset();
  };

  const handleDeleteAccount = () => {
    // In a real app, call deleteAccount mutation
    dispatch(logout());
    navigate('/login');
    toast.success('Account deleted');
  };

  return (
    <PageLayout sidebar={<WorkspaceList />}>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 page-transition">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

        {/* Profile */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Profile
          </h2>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <Input
              label="Display name"
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={profileForm.formState.isSubmitting}
              >
                Save changes
              </Button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Change Password
          </h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={passwordForm.formState.isSubmitting}
              >
                Update password
              </Button>
            </div>
          </form>
        </section>

        {/* Appearance */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Dark mode
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Toggle between light and dark theme
              </p>
            </div>
            <button
              onClick={() => dispatch(toggleDarkMode())}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              style={{ backgroundColor: isDarkMode ? '#0ea5e9' : '#d1d5db' }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: isDarkMode ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Delete account
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setIsDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </section>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Account"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This action is permanent and cannot be undone. All your workspaces, folders, and notes will be deleted.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
              Delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
