'use client';
import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';
import { Trophy, TrendingUp, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const supabase = createClient();
type ScoreRow = { userId: string; displayName: string; score: number; eventsAttended: number; eventsTotal: number; avatarIdx: number };

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export default function ScorePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const loadScores = async () => {
      setLoadingScores(true);
      const [{ data: scoreRows }, { data: profiles }] = await Promise.all([
        supabase.from('monthly_scores').select('user_id,score,events_attended,events_total').eq('year', year).eq('month', month + 1),
        supabase.from('user_profiles').select('id,display_name'),
      ]);
      if (cancelled) return;
      const profileMap = new Map((profiles || []).map((item) => [item.id, item.display_name]));
      const mapped = (scoreRows || []).map((row, index) => ({
        userId: row.user_id,
        displayName: profileMap.get(row.user_id) || 'חבר',
        score: row.score || 0,
        eventsAttended: row.events_attended || 0,
        eventsTotal: row.events_total || 0,
        avatarIdx: index,
      })).sort((a, b) => b.score - a.score);
      setScores(mapped);
      setLoadingScores(false);
    };
    void loadScores();
    return () => { cancelled = true; };
  }, [year, month]);

  const myScore = scores.find((s) => s.userId === profile?.id) || {
    userId: profile?.id || '',
    displayName: profile?.display_name || 'הפרופיל שלי',
    score: 0,
    eventsAttended: 0,
    eventsTotal: 0,
    avatarIdx: 0,
  };
  const myRank = profile?.id ? scores.findIndex((s) => s.userId === profile.id) + 1 : 0;

  // Monthly history (last 6 months)
  const history = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - i, 1);
    const s = d.getFullYear() === year && d.getMonth() === month ? myScore : undefined;
    return {
      label: `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`,
      score: s?.score ?? 0,
      attended: s?.eventsAttended ?? 0,
      total: s?.eventsTotal ?? 0,
    };
  }).reverse();

  const maxScore = Math.max(...history.map((h) => h.score), 1);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <AppLayout activeRoute="/score">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Trophy size={20} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ניקוד ולוח מובילים</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">מבוסס על דיווחי נוכחות אישיים בלבד</p>
      </div>

      {/* Month navigator */}
      <div className="bg-card border border-border rounded-xl p-4 card-shadow mb-5 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>
        <div className="text-center">
          <p className="font-bold text-foreground text-lg">{MONTH_NAMES_HE[month]} {year}</p>
          <p className="text-xs text-muted-foreground">לוח מובילים חודשי</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Leaderboard */}
        <div className="xl:col-span-3 space-y-4">
          {/* My score card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {getInitials(myScore.displayName)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{myScore.displayName} <span className="text-xs text-muted-foreground">(אני)</span></p>
                      <p className="text-xs text-muted-foreground">נוכחות: השתתפת ב־{myScore.eventsAttended} מתוך {myScore.eventsTotal} אירועים</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-primary font-tabular">{myScore.score}</p>
                <p className="text-xs text-muted-foreground">נקודות</p>
              </div>
              {myRank > 0 && (
                <div className="text-left">
                  <p className="text-lg">{myRank <= 3 ? RANK_MEDAL[myRank - 1] : `#${myRank}`}</p>
                  <p className="text-xs text-muted-foreground">מיקום</p>
                </div>
              )}
            </div>
          </div>

          {/* Full leaderboard */}
          <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">לוח מובילים — {MONTH_NAMES_HE[month]} {year}</p>
            </div>
            <div className="divide-y divide-border">
              {scores.map((s, idx) => {
                const isMe = s.userId === profile?.id;
                return (
                  <div
                    key={`score-${s.userId}`}
                    className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {idx < 3 ? (
                        <span className="text-lg">{RANK_MEDAL[idx]}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground font-tabular">#{idx + 1}</span>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(s.avatarIdx)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitials(s.displayName)}
                    </div>
                    <span className={`flex-1 text-sm ${isMe ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      {s.displayName}{isMe && ' (אני)'}
                    </span>
                    <div className="text-left">
                      <span className="text-sm font-bold text-foreground font-tabular">{s.score}</span>
                      <span className="text-xs text-muted-foreground mr-1">נק׳</span>
                    </div>
                    <div className="text-left text-xs text-muted-foreground w-24">
                      {s.eventsAttended} מתוך {s.eventsTotal}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* History chart */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">היסטוריה אישית — 6 חודשים</h3>
            </div>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={`hist-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{h.label}</span>
                    <span className="text-xs font-bold text-foreground font-tabular">{h.score} נק׳</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(h.score / maxScore) * 100}%` }}
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground mt-0.5">נוכחות: {h.attended} מתוך {h.total} אירועים</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring rules */}
          <div className="bg-card border border-border rounded-xl p-4 card-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Star size={15} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">כיצד מחשבים ניקוד?</h3>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>כל פעילות שהשתתפת בה</span>
                <span className="font-bold text-foreground">1 נק׳</span>
              </div>
              <div className="flex items-center justify-between">
                <span>כולל זום PT100</span>
                <span className="font-bold text-foreground">1 נק׳</span>
              </div>
            </div>
            <p className="text-2xs text-muted-foreground mt-3 pt-3 border-t border-border">
              לדוגמה: 8/10 פירושו שהשתתפת ב־8 מתוך 10 פעילויות שמופיעות בלוח של החודש. כל פעילות, כולל זום PT100, שווה נקודה אחת. הנתונים מתעדכנים אחרי דיווח נוכחות או הוספת פעילות.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
