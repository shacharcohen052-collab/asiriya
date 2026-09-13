'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const passwordValue = watch('password', '');

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signUp(data.email, data.password, { fullName: data.fullName });
      // Check approval status after signup
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_approved')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.is_approved === true) {
          router.push('/');
          router.refresh();
        } else {
          router.push('/access-denied');
        }
      } else {
        // Email confirmation may be required — go to access-denied as fallback
        router.push('/access-denied');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrorMsg('כתובת האימייל כבר רשומה. נסה להתחבר.');
      } else {
        setErrorMsg(msg || 'שגיאה בהרשמה. נסה שוב.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'שגיאה בהתחברות עם Google.');
      setGoogleLoading(false);
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
          <span>{googleLoading ? 'מתחבר...' : 'הרשמה עם Google'}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">או</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Full name */}
        <div>
          <label htmlFor="signup-name" className="block text-sm font-semibold text-foreground mb-1.5">
            שם מלא
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="שם פרטי ושם משפחה"
            className={`input-field ${errors.fullName ? 'error' : ''}`}
            {...register('fullName', { required: 'שם מלא הוא שדה חובה' })}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="signup-email" className="block text-sm font-semibold text-foreground mb-1.5">
            כתובת אימייל
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">
            השתמש באימייל שאיתו נרשמת ל-PT100
          </p>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="block text-sm font-semibold text-foreground mb-1.5">
            סיסמה
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="לפחות 8 תווים"
              className={`input-field ${errors.password ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
              {...register('password', {
                required: 'סיסמה היא שדה חובה',
                minLength: { value: 8, message: 'לפחות 8 תווים' },
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

        {/* Confirm password */}
        <div>
          <label htmlFor="signup-confirm" className="block text-sm font-semibold text-foreground mb-1.5">
            אימות סיסמה
          </label>
          <div className="relative">
            <input
              id="signup-confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="הזן שוב את הסיסמה"
              className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
              style={{ paddingLeft: '2.5rem' }}
              {...register('confirmPassword', {
                required: 'אימות סיסמה הוא שדה חובה',
                validate: (val) => val === passwordValue || 'הסיסמאות אינן תואמות',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'הסתר סיסמה' : 'הצג סיסמה'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive">{errorMsg}</p>
          </div>
        )}

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
              <span>יוצר חשבון...</span>
            </>
          ) : (
            'הרשמה ל-PT100'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="btn-ghost w-full text-sm"
        >
          כבר יש לך חשבון? התחבר
        </button>
      </div>
    </form>
  );
}