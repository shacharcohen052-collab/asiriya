'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('הסיסמה צריכה להכיל לפחות 8 תווים.');
    if (password !== confirm) return setError('הסיסמאות אינן תואמות.');
    setLoading(true);
    setError('');
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => router.replace('/'), 1200);
    } catch (err: any) {
      setError(err?.message || 'קישור האיפוס פג תוקף. בקש קישור חדש.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 card-shadow space-y-5">
        <div className="text-center">
          <AppLogo size={52} />
          <h1 className="mt-3 text-2xl font-bold text-foreground">איפוס סיסמה</h1>
          <p className="mt-1 text-sm text-muted-foreground">בחר סיסמה חדשה לחשבון PT100</p>
        </div>
        <div className="relative">
          <label className="block text-sm font-semibold text-foreground mb-1.5">סיסמה חדשה</label>
          <input className="input-field" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
          <button type="button" onClick={() => setShow(!show)} className="absolute left-3 top-9 text-muted-foreground" aria-label="הצג או הסתר סיסמה">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">אימות סיסמה</label>
          <input className="input-field" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} autoComplete="new-password" />
        </div>
        {error && <p className="p-3 rounded-lg bg-destructive/10 text-xs text-destructive">{error}</p>}
        {success && <p className="p-3 rounded-lg bg-green-50 text-xs text-green-700">הסיסמה עודכנה. מעביר אותך לאפליקציה...</p>}
        <button type="submit" disabled={loading || success} className="btn-primary w-full py-3">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'שמור סיסמה חדשה'}
        </button>
      </form>
    </main>
  );
}
