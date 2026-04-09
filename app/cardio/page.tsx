'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CardioPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/record');
  }, [router]);
  return null;
}
