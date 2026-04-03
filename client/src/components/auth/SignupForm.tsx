import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { useSignupMutation } from '@/store/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak' };
  if (score <= 3) return { score, label: 'Fair' };
  return { score, label: 'Strong' };
}

const strengthColors = ['', 'bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];
const strengthTextColors = ['', 'text-red-500', 'text-red-400', 'text-yellow-500', 'text-green-400', 'text-green-500'];

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { setCredentials } = useAuth();
  const [signup, { isLoading }] = useSignupMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    try {
      const result = await signup({
        name: data.name,
        email: data.email,
        password: data.password,
      }).unwrap();
      setCredentials(result.user, result.token);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'Signup failed. Please try again.';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Jane Smith"
        leftAdornment={<User className="h-4 w-4" />}
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        leftAdornment={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="space-y-1">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          leftAdornment={<Lock className="h-4 w-4" />}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
        {password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    i <= strength.score ? strengthColors[strength.score] : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              ))}
            </div>
            <p className={cn('text-xs font-medium', strengthTextColors[strength.score])}>
              {strength.label}
            </p>
          </div>
        )}
      </div>

      <Input
        label="Confirm password"
        type={showConfirm ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="••••••••"
        leftAdornment={<Lock className="h-4 w-4" />}
        rightAdornment={
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Create account
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
