'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor, Member } from '@/data/members';
import { Search, Heart, Users } from 'lucide-react';
import Link from 'next/link';

function MemberCard({ member, index }: { member: Member; index: number }) {
  const initials = getInitials(member.displayName);
  const avatarColor = getAvatarColor(index);

  return (
    <Link href={`/members/${member.profileId}`} className="block group">
      <div className="bg-card border border-border rounded-xl p-5 card-shadow hover:card-shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
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

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {member.relationshipStatus && (
            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
              <Heart size={10} />
              {member.relationshipStatus}
            </span>
          )}
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

  const filtered = MEMBERS.filter((m) =>
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
        <p className="text-muted-foreground text-sm mr-12">{MEMBERS.length} חברים</p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="חפש חבר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pr-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>לא נמצאו חברים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((member, i) => (
            <MemberCard key={member.profileId} member={member} index={i} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
