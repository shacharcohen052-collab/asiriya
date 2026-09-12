'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Demo credentials for the Asiriya app
const DEMO_ACCOUNTS = [
  { role: 'חבר עשירייה', email: 'shachar@asiriya.co.il', password: 'Asiriya2026!' },
  { role: 'חבר עשירייה', email: 'daniel@asiriya.co.il', password: 'Asiriya2026!' },
  { role: 'חבר עשירייה', email: 'noa@asiriya.co.il', password: 'Asiriya2026!' },
];

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    // Backend integration point: POST /api/auth/login { email, password }
    await new Promise((r) => setTimeout(r, 1200));

    const valid = DEMO_ACCOUNTS.some(
      (a) => a.email === data.email && a.password === data.password
    );

    if (!valid) {
      setLoading(false);
      setError('email', {
        message: 'פרטים שגויים — השתמש בחשבונות הדגמה למטה להתחברות',
      });
      return;
    }

    toast.success('התחברת בהצלחה! ברוך הבא.');
    router.push('/');
  };

  const autofill = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
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
              className={`input-field pl-10 ${errors.password ? 'error' : ''}`}
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

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="remember-me"
            type="checkbox"
            className="w-4 h-4 rounded accent-primary"
            {...register('rememberMe')}
          />
          <label htmlFor="remember-me" className="text-sm text-muted-foreground">
            זכור אותי
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base"
          style={{ minHeight: '48px', minWidth: '120px' }}
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

      {/* Demo credentials */}
      <div className="mt-6 border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-muted border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground">חשבונות דגמה</p>
        </div>
        <div className="divide-y divide-border">
          {DEMO_ACCOUNTS.map((account) => (
            <div
              key={`demo-${account.email}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{account.role}</p>
                <p className="text-2xs text-muted-foreground">{account.email}</p>
              </div>
              <button
                type="button"
                onClick={() => autofill(account.email, account.password)}
                className="text-xs text-primary font-semibold hover:underline px-2 py-1 rounded hover:bg-fixed-meeting-bg transition-colors"
              >
                השתמש
              </button>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}