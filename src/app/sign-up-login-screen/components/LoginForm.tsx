'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();
  const { signIn, signInWithGoogle, resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signIn(data.email, data.password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'שגיאה בהתחברות. בדוק את הפרטים ונסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      // Redirect handled by OAuth callback
    } catch (err: any) {
      setErrorMsg(err?.message || 'שגיאה בהתחברות עם Google.');
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = getValues('email');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg('הזן כתובת אימייל תקינה כדי לקבל קישור לאיפוס סיסמה.');
      return;
    }
    setResetLoading(true);
    setErrorMsg('');
    try {
      await resetPassword(email);
      setResetSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'לא ניתן לשלוח קישור איפוס. נסה שוב.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-xl bg-card hover:bg-muted transition-colors text-sm font-semibold text-foreground"
          style={{ minHeight: '48px' }}
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          <span>{googleLoading ? 'מתחבר...' : 'התחברות עם Google'}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">או</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-foreground mb-1.5">
            כתובת אימייל
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            className={`input-field ${errors.email ? 'error' : ''}`}
            {...register('email', {
              required: 'אימייל הוא שדה חובה',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'כתובת אימייל לא תקינה' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="login-password" className="block text-sm font-semibold text-foreground mb-1.5">
            סיסמה
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`input-field ${errors.password ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
              {...register('password', {
                required: 'סיסמה היא שדה חובה',
                minLength: { value: 6, message: 'סיסמה חייבת להכיל לפחות 6 תווים' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive">{errorMsg}</p>
          </div>
        )}
        {resetSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">קישור לאיפוס סיסמה נשלח לאימייל. בדוק גם בתיקיית הספאם.</p>
          </div>
        )}

        <button type="button" onClick={handleResetPassword} disabled={resetLoading || loading || googleLoading} className="w-full text-center text-xs text-primary hover:underline">
          {resetLoading ? 'שולח קישור...' : 'שכחתי סיסמה'}
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="btn-primary w-full py-3 text-base"
          style={{ minHeight: '48px' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>מתחבר...</span>
            </>
          ) : (
            'התחברות'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToSignup}
          className="btn-ghost w-full text-sm"
        >
          אין לך חשבון? הירשם
        </button>
      </div>
    </form>
  );
}
