'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Loader2, Shield, User } from 'lucide-react';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  telegramChatId?: string | null;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Quản lý người dùng</h1>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm text-slate-900">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Tên', 'Email', 'Vai trò', 'Telegram', 'Trạng thái'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name[0]}
                      </div>
                      <span className="text-slate-900">{u.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.telegramChatId || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{u.isActive ? 'Hoạt động' : 'Đã khóa'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
