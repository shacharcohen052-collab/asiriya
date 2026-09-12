'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SignupFormData {
  fullName: string;
  username: string;
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
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const passwordValue = watch('password', '');

  const onSubmit = async (_data: SignupFormData) => {
    setLoading(true);
    // Backend integration point: POST /api/auth/signup { fullName, username, email, password }
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    toast.success('החשבון נוצר! ברוך הבא לעשירייה.');
    router.push('/');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
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

        {/* Username */}
        <div>
          <label htmlFor="signup-username" className="block text-sm font-semibold text-foreground mb-1.5">
            שם משתמש
          </label>
          <p className="text-2xs text-muted-foreground mb-1.5">כיצד תוצג לחברי העשירייה</p>
          <input
            id="signup-username"
            type="text"
            autoComplete="username"
            placeholder="שחר123"
            className={`input-field ${errors.username ? 'error' : ''}`}
            {...register('username', {
              required: 'שם משתמש הוא שדה חובה',
              minLength: { value: 3, message: 'לפחות 3 תווים' },
              pattern: { value: /^[a-zA-Z0-9\u0590-\u05FF_-]+$/, message: 'תווים לא חוקיים' },
            })}
          />
          {errors.username && (
            <p className="text-xs text-destructive mt-1">{errors.username.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="signup-email" className="block text-sm font-semibold text-foreground mb-1.5">
            כתובת אימייל
          </label>
          <p className="text-2xs text-muted-foreground mb-1.5">
            אם נרשמת בעבר, הפרופיל שלך יוטען אוטומטית
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

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
          style={{ minHeight: '48px' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>יוצר חשבון...</span>
            </>
          ) : (
            'הרשמה לעשירייה'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="btn-ghost w-full text-sm"
        >
          כבר יש לך חשבון? התחבר
        </button>

        <p className="text-center text-2xs text-muted-foreground">
          בהרשמה אתה מסכים ל
          <a href="#" className="text-primary hover:underline mx-1">תנאי השימוש</a>
          ול
          <a href="#" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
        </p>
      </div>
    </form>
  );
}