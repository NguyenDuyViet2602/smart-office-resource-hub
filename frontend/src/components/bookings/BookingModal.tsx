'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Users, FileText, Loader2, AlertCircle, CalendarX } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsApi, getApiErrorMessage } from '@/lib/api';

interface Room {
  id: string;
  name: string;
  capacity: number;
  features: string[];
}

interface ScheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface BookingModalProps {
  room: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function hasOverlap(slotStart: string, slotEnd: string, pickStart: string, pickEnd: string): boolean {
  return new Date(slotStart) < new Date(pickEnd) && new Date(slotEnd) > new Date(pickStart);
}

/** Trả về chuỗi YYYY-MM-DD theo giờ địa phương (tránh UTC date sai ngày) */
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Ghép date string + time string thành ISO UTC, luôn dùng local timezone */
function toLocalISO(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, mo - 1, d, h, min, 0).toISOString();
}

export default function BookingModal({ room, onClose, onSuccess }: BookingModalProps) {
  const today = localDateString(new Date());
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (!room) return;
    setScheduleLoading(true);
    bookingsApi
      .roomSchedule(room.id, date)
      .then((res) => setSchedule(res.data))
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false));
  }, [room, date]);

  if (!room) return null;

  const startISO = toLocalISO(date, startTime);
  const endISO = toLocalISO(date, endTime);
  const isTimeValid = new Date(endISO) > new Date(startISO);
  const isConflict =
    isTimeValid &&
    schedule.some(
      (s) => s.status !== 'cancelled' && hasOverlap(s.startTime, s.endTime, startISO, endISO),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isTimeValid) {
        toast.error('Giờ kết thúc phải sau giờ bắt đầu');
        return;
      }
      if (isConflict) {
        toast.error('Khung giờ này trùng lịch đã đặt, vui lòng chọn giờ khác');
        return;
      }

      await bookingsApi.create({
        resourceType: 'room',
        roomId: room.id,
        startTime: startISO,
        endTime: endISO,
        notes,
      });

      toast.success(`Đã đặt ${room.name} thành công!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Đặt phòng thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Đặt phòng</h2>
            <p className="text-slate-500 text-sm mt-0.5">{room.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 bg-slate-50 mx-6 mt-4 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Sức chứa: {room.capacity} người</span>
          </div>
          {room.features?.length > 0 && (
            <p className="text-sm text-slate-600">
              Tính năng: {room.features.join(', ')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Lịch phòng trong ngày */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              <CalendarX className="w-3.5 h-3.5 text-rose-500" />
              Lịch đã đặt trong ngày
            </p>
            {scheduleLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải...
              </div>
            ) : schedule.length === 0 ? (
              <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                ✅ Phòng trống cả ngày
              </p>
            ) : (
              <div className="space-y-1.5">
                {schedule.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-medium text-rose-700">
                      {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                    </span>
                    <span className="text-rose-400 text-xs ml-auto">Đã đặt</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Bắt đầu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                  isConflict
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50'
                    : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Kết thúc
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                  isConflict
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50'
                    : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          {isConflict && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Khung giờ này trùng lịch đã đặt. Vui lòng chọn giờ khác.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              placeholder="Mô tả cuộc họp..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || isConflict}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Đang đặt...' : 'Xác nhận đặt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
