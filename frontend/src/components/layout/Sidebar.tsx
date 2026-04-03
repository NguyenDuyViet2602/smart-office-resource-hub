'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Map,
  Calendar,
  Package,
  Users,
  LogOut,
  Building2,
  UserCircle,
} from 'lucide-react';
import { clearAuth, getUser } from '@/lib/auth';

const navItems = [
  { href: '/map', icon: Map, label: 'Bản đồ văn phòng' },
  { href: '/bookings', icon: Calendar, label: 'Đặt chỗ của tôi' },
  { href: '/equipment', icon: Package, label: 'Thiết bị' },
];

const adminItems = [
  { href: '/admin/bookings', icon: Calendar, label: 'Tất cả đặt chỗ' },
  { href: '/admin/rooms', icon: Building2, label: 'Quản lý phòng' },
  { href: '/admin/equipment', icon: Package, label: 'Quản lý thiết bị' },
  { href: '/admin/users', icon: Users, label: 'Quản lý người dùng' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">Smart Office</p>
            <p className="text-xs text-slate-400">Resource Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2">Menu chính</p>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname === href
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
              Quản trị
            </p>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Link
          href="/profile"
          className={`flex items-center gap-3 mb-3 px-2 py-2 rounded-lg transition-colors ${
            pathname === '/profile'
              ? 'bg-indigo-600'
              : 'hover:bg-slate-800'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
          <UserCircle className="w-4 h-4 text-slate-400" />
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
