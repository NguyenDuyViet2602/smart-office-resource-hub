'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import AiChatWidget from '@/components/ai-chat/AiChatWidget';
import { getToken } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto text-slate-900">
        {children}
      </main>
      <AiChatWidget />
    </div>
  );
}
