'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The import-profiles screen has been removed per PT100 spec.
// Profiles are managed by administrators through database seed/migration only.
export default function ImportProfilesPage() {
  const router = useRouter();

  useEffect(() => {
    router?.replace('/');
  }, [router]);

  return null;
}
