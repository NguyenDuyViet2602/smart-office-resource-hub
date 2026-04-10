'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { bookingsApi, getApiErrorMessage } from '@/lib/api';
import { Calendar, Clock, MapPin, Package, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const STATUS_CONFIG = {
  confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Hoàn thành', color: 'bg-slate-100 text-slate-600', icon: CheckCircle },
  no_show: { label: 'Vắng mặt', color: 'bg-orange-100 text-orange-700', icon: XCircle },
};

interface Booking {
  id: string;
  resourceType: 'room' | 'equipment';
  room?: { name: string; capacity: number };
  equipment?: { name: string; type: string };
  startTime: string;
  endTime: string;
  status: keyof typeof STATUS_CONFIG;
  notes?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list();
      setBookings(res.data.sort((a: Booking, b: Booking) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ));
    } catch {
      toast.error('Không tải được danh sách đặt chỗ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc muốn hủy đặt chỗ này?')) return;
    setCancelling(id);
    try {
      await bookingsApi.cancel(id);
      toast.success('Đã hủy đặt chỗ');
      loadBookings();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Hủy thất bại'));
    } finally {
      setCancelling(null);
    }
  };

  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.startTime) > new Date()
  );
  const past = bookings.filter(
    (b) => b.status !== 'confirmed' || new Date(b.startTime) <= new Date()
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Đặt chỗ của tôi</h1>
          <p className="text-slate-500 mt-1">Quản lý các đặt chỗ phòng họp và thiết bị</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-slate-900 mb-4">Sắp tới ({upcoming.length})</h2>
                <div className="grid gap-4">
                  {upcoming.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onCancel={handleCancel}
                      cancelling={cancelling === booking.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-slate-900 mb-4">Lịch sử</h2>
                <div className="grid gap-3">
                  {past.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} isPast />
                  ))}
                </div>
              </section>
            )}

            {bookings.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">Chưa có đặt chỗ nào</p>
                <p className="text-sm mt-1">Đi tới Bản đồ văn phòng để đặt phòng</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
  isPast = false,
}: {
  booking: Booking;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
  isPast?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className={`bg-white rounded-xl border p-4 md:p-5 shadow-sm ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 md:gap-4">
          <div className={`p-2.5 rounded-lg ${booking.resourceType === 'room' ? 'bg-indigo-100' : 'bg-orange-100'}`}>
            {booking.resourceType === 'room'
              ? <MapPin className="w-5 h-5 text-indigo-600" />
              : <Package className="w-5 h-5 text-orange-600" />}
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {booking.room?.name || booking.equipment?.name || 'Không xác định'}
            </p>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(booking.startTime), 'dd/MM/yyyy', { locale: vi })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(booking.startTime), 'HH:mm')} – {format(new Date(booking.endTime), 'HH:mm')}
              </span>
            </div>
            {booking.notes && (
              <p className="text-sm text-slate-400 mt-1">{booking.notes}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusCfg.label}
          </span>
          {!isPast && booking.status === 'confirmed' && onCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Hủy đặt chỗ"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
