'use client';
import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor, Member } from '@/data/members';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
type ProfileRow = { id: string; email: string; display_name: string; profile_id: number | null; life_work: string | null; relationship_status: string | null; hobbies: string | null; path_duration: string | null; connection_strength: string | null; desired_quality: string | null };

function MemberCard({ member, index, href }: { member: Member; index: number; href: string }) {
  const initials = getInitials(member.displayName);
  const avatarColor = getAvatarColor(index);

  return (
    <Link href={href} className="block group">
      <div className="bg-card border border-border rounded-2xl p-4 card-shadow hover:card-shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white text-base font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-tight truncate">{member.displayName}</h3>
            {member.lifeWork && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{member.lifeWork}</p>
            )}
          </div>
        </div>

        {/* Connection strength */}
        {member.connectionStrength && (
          <div className="mt-auto pt-3 border-t border-border">
            <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">מה מחזק אותי</p>
            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{member.connectionStrength}</p>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    void supabase.from('user_profiles').select('id,email,display_name,profile_id,life_work,relationship_status,hobbies,path_duration,connection_strength,desired_quality').eq('is_approved', true).eq('is_removed', false).order('display_name').limit(200).then(({ data }) => setProfiles((data || []) as ProfileRow[]));
  }, []);

  const members = useMemo(() => profiles.map((profile, index) => {
    const known = MEMBERS.find((member) => member.email.toLowerCase() === profile.email.toLowerCase());
    return {
      member: { profileId: profile.profile_id ?? 100000 + index, email: profile.email, displayName: profile.display_name, lifeWork: profile.life_work ?? known?.lifeWork ?? null, relationshipStatus: profile.relationship_status ?? known?.relationshipStatus ?? null, hobbies: profile.hobbies ?? known?.hobbies ?? null, pathDuration: profile.path_duration ?? known?.pathDuration ?? null, connectionStrength: profile.connection_strength ?? known?.connectionStrength ?? null, desiredQuality: profile.desired_quality ?? known?.desiredQuality ?? null },
      href: `/members/${profile.id}`,
    };
  }), [profiles]);

  const filtered = members.filter(({ member: m }) =>
    m.displayName.includes(search) ||
    (m.lifeWork || '').includes(search) ||
    (m.hobbies || '').includes(search)
  );

  return (
    <AppLayout activeRoute="/members">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">חברי PT100</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">{members.length || MEMBERS.length} חברים</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="חפש חבר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field !pr-12 !pl-4"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>לא נמצאו חברים</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(({ member, href }, i) => (
            <MemberCard key={href} member={member} index={i} href={href} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
