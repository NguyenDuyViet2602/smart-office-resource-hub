'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { bookingsApi } from '@/lib/api';
import { MapPin, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdminBookingRow {
  id: string;
  resourceType: string;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  notes?: string;
  user?: { name: string };
  room?: { name: string };
  equipment?: { name: string };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.listAll();
      const rows = res.data as AdminBookingRow[];
      setBookings(
        [...rows].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 md:mb-8">Tất cả đặt chỗ</h1>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-900 bg-white min-w-[640px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Người đặt', 'Tài nguyên', 'Thời gian', 'Trạng thái', 'Ghi chú'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {b.resourceType === 'room'
                          ? <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          : <Package className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        <span className="font-medium">{b.room?.name || b.equipment?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(b.startTime), 'dd/MM HH:mm')} → {format(new Date(b.endTime), 'HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
