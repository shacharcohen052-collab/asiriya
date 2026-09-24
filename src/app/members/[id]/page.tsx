'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor, Member } from '@/data/members';
import { ArrowRight, Briefcase, Clock, Sparkles, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
type ProfileRow = { id: string; email: string; display_name: string; profile_id: number | null; life_work: string | null; hobbies: string | null; path_duration: string | null; connection_strength: string | null; desired_quality: string | null };
type DisplayMember = Member & { databaseId?: string };

interface QARowProps { icon: React.ReactNode; label: string; value: string | null | undefined }
function QARow({ icon, label, value }: QARowProps) {
  if (!value) return null;
  return <div className="bg-muted/50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><span className="text-primary">{icon}</span><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span></div><p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{value}</p></div>;
}

export default function MemberProfilePage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [member, setMember] = useState<DisplayMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numericMember = MEMBERS.find((item) => String(item.profileId) === id);
    if (numericMember) { setMember(numericMember); setLoading(false); return; }
    void supabase.from('user_profiles').select('id,email,display_name,profile_id,life_work,hobbies,path_duration,connection_strength,desired_quality').eq('id', id).maybeSingle().then(({ data }) => {
      const profile = data as ProfileRow | null;
      if (profile) {
        const known = MEMBERS.find((item) => item.email.toLowerCase() === profile.email.toLowerCase());
        setMember({ profileId: profile.profile_id ?? 0, databaseId: profile.id, email: profile.email, displayName: profile.display_name, lifeWork: profile.life_work ?? known?.lifeWork ?? null, relationshipStatus: known?.relationshipStatus ?? null, hobbies: profile.hobbies ?? known?.hobbies ?? null, pathDuration: profile.path_duration ?? known?.pathDuration ?? null, connectionStrength: profile.connection_strength ?? known?.connectionStrength ?? null, desiredQuality: profile.desired_quality ?? known?.desiredQuality ?? null });
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <AppLayout activeRoute="/members"><div className="text-center py-20 text-muted-foreground">טוען פרופיל...</div></AppLayout>;
  if (!member) return <AppLayout activeRoute="/members"><div className="text-center py-20"><p className="text-muted-foreground">חבר לא נמצא</p><Link href="/members" className="btn-primary mt-4 inline-flex">חזרה לחברים</Link></div></AppLayout>;

  const memberIndex = Math.max(0, MEMBERS.findIndex((item) => item.email.toLowerCase() === member.email.toLowerCase()));
  const initials = getInitials(member.displayName);
  const avatarColor = getAvatarColor(memberIndex);
  return <AppLayout activeRoute="/members">
    <Link href="/members" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"><ArrowRight size={16} /><span>חברי PT100</span></Link>
    <div className="bg-card border border-border rounded-2xl p-6 card-shadow mb-5"><div className="flex items-start gap-4"><div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>{initials}</div><div className="flex-1 min-w-0"><h1 className="text-2xl font-bold text-foreground">{member.displayName}</h1>{member.lifeWork && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{member.lifeWork}</p>}<div className="flex flex-wrap gap-2 mt-3"><span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium">חבר PT100</span></div></div></div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><QARow icon={<Briefcase size={15} />} label="עבודה ועיסוק" value={member.lifeWork} /><QARow icon={<Sparkles size={15} />} label="תחביבים ותחומי עניין" value={member.hobbies} /><QARow icon={<Clock size={15} />} label="כמה זמן בדרך" value={member.pathDuration} /><QARow icon={<Zap size={15} />} label="מה מחזק אותי מהחברים" value={member.connectionStrength} /><QARow icon={<Target size={15} />} label="מה הייתי רוצה להביא יותר" value={member.desiredQuality} /></div>
  </AppLayout>;
}
