'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Building2, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { authApi, getApiErrorMessage } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Email đặt lại mật khẩu đã được gửi!');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Gửi email thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Quên mật khẩu</h1>
          <p className="text-slate-400 mt-1">Nhập email để nhận hướng dẫn đặt lại mật khẩu</p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 shadow-2xl border border-white/20">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-green-400 text-lg font-medium">Email đã được gửi!</div>
              <p className="text-slate-300 text-sm">
                Kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
              </button>

              <p className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-300 text-sm"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Quay lại đăng nhập
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
