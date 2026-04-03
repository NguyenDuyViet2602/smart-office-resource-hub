'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { usersApi, getApiErrorMessage } from '@/lib/api';
import { getUser, setAuth, getToken, User } from '@/lib/auth';
import { Save, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi
      .getProfile()
      .then((res) => {
        const u = res.data;
        setName(u.name || '');
        setEmail(u.email || '');
        setRole(u.role || '');
        setTelegramChatId(u.telegramChatId || '');
      })
      .catch(() => {
        // Fallback to localStorage
        const u = getUser();
        if (u) {
          setName(u.name);
          setEmail(u.email);
          setRole(u.role);
          setTelegramChatId(u.telegramChatId || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await usersApi.updateProfile({ name, telegramChatId: telegramChatId || undefined });
      const updated: User = res.data;
      const token = getToken();
      if (token) {
        setAuth(token, {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role as 'admin' | 'employee',
          telegramChatId: updated.telegramChatId,
          avatarUrl: updated.avatarUrl,
        });
      }
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cập nhật hồ sơ thất bại'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Hồ sơ cá nhân</h1>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-500">
            Đang tải...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {/* Basic info */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                <input
                  type="text"
                  value={role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed capitalize"
                />
              </div>
            </div>

            {/* Telegram section */}
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-slate-900">Thông báo Telegram</h2>
              </div>

              <p className="text-sm text-slate-600">
                Nhập Telegram Chat ID để nhận thông báo đặt phòng, nhắc lịch họp, và trả thiết bị.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="VD: 6092779522"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <p className="font-medium">Cách lấy Chat ID:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Mở Telegram, tìm bot{' '}
                    <span className="font-mono bg-blue-100 px-1 rounded">@smart_office_hub_bot</span>
                  </li>
                  <li>
                    Nhấn <strong>Start</strong> hoặc gửi <span className="font-mono bg-blue-100 px-1 rounded">/start</span>
                  </li>
                  <li>
                    Tìm <span className="font-mono bg-blue-100 px-1 rounded">@userinfobot</span> trên Telegram
                  </li>
                  <li>Gửi tin nhắn bất kỳ → bot sẽ trả về Chat ID của bạn</li>
                  <li>Dán Chat ID vào ô bên trên và nhấn Lưu</li>
                </ol>
              </div>
            </div>

            {/* Save button */}
            <div className="p-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
