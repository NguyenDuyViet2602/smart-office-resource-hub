'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OfficeMap from '@/components/map/OfficeMap';
import BookingModal from '@/components/bookings/BookingModal';
import { roomsApi, floorsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Floor {
  id: string;
  name: string;
  floorNumber: number;
}

interface MapCoords {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: 'rect' | 'circle';
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  features: string[];
  status: 'available' | 'maintenance' | 'inactive';
  mapCoords?: MapCoords;
  floorId?: string;
  isBooked?: boolean;
}

export default function MapPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now] = useState(new Date());

  const loadFloorsAndRooms = useCallback(async () => {
    try {
      const floorsRes = await floorsApi.list();
      setFloors(floorsRes.data);
      setSelectedFloor((prev) => prev ?? floorsRes.data[0] ?? null);
    } catch {
      toast.error('Không tải được dữ liệu tầng');
    }
  }, []);

  const loadRooms = useCallback(async (floorId: string) => {
    setLoading(true);
    try {
      const [roomsRes, activeRes] = await Promise.all([
        roomsApi.list(floorId),
        roomsApi.available({
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      ]);

      const availableIds = new Set((activeRes.data as { id: string }[]).map((r) => r.id));
      const enriched = (roomsRes.data as Room[]).map((room) => ({
        ...room,
        isBooked: room.status === 'available' && !availableIds.has(room.id),
      }));
      setRooms(enriched);
    } catch {
      toast.error('Không tải được danh sách phòng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFloorsAndRooms();
  }, [loadFloorsAndRooms]);

  useEffect(() => {
    if (selectedFloor) {
      void loadRooms(selectedFloor.id);
    }
  }, [selectedFloor, loadRooms]);

  useEffect(() => {
    const socket = getSocket();
    const onAvailability = (update: { roomId: string; available: boolean }) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === update.roomId ? { ...r, isBooked: !update.available } : r
        )
      );
    };
    const refreshRooms = () => {
      if (selectedFloor) void loadRooms(selectedFloor.id);
    };

    socket.on('room:availability', onAvailability);
    socket.on('booking:created', refreshRooms);
    socket.on('booking:cancelled', refreshRooms);

    if (selectedFloor) {
      socket.emit('join:floor', selectedFloor.id);
    }

    return () => {
      socket.off('room:availability', onAvailability);
      socket.off('booking:created', refreshRooms);
      socket.off('booking:cancelled', refreshRooms);
    };
  }, [selectedFloor, loadRooms]);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    if (room.status === 'available' && !room.isBooked) {
      setShowModal(true);
    } else {
      const status = room.status !== 'available' ? 'đang bảo trì' : 'đã được đặt';
      toast(`Phòng ${room.name} ${status}`, { icon: '⚠️' });
    }
  };

  const stats = {
    available: rooms.filter((r) => r.status === 'available' && !r.isBooked).length,
    booked: rooms.filter((r) => r.isBooked).length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="px-8 py-6 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bản đồ văn phòng</h1>
              <p className="text-slate-500 text-sm mt-1">
                {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                {[
                  { color: 'bg-green-100 text-green-700', count: stats.available, label: 'Còn trống' },
                  { color: 'bg-red-100 text-red-700', count: stats.booked, label: 'Đã đặt' },
                  { color: 'bg-amber-100 text-amber-700', count: stats.maintenance, label: 'Bảo trì' },
                ].map(({ color, count, label }) => (
                  <div key={label} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${color}`}>
                    {count} {label}
                  </div>
                ))}
              </div>
              <button
                onClick={() => selectedFloor && loadRooms(selectedFloor.id)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {floors.length > 1 && (
            <div className="flex gap-2 mt-4">
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedFloor?.id === floor.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-lg">Chưa có phòng nào được cấu hình</p>
              <p className="text-sm mt-1">Admin cần thêm phòng và cấu hình tọa độ bản đồ</p>
            </div>
          ) : (
            <OfficeMap
              rooms={rooms}
              onRoomClick={handleRoomClick}
              selectedRoomId={selectedRoom?.id}
            />
          )}
        </div>
      </div>

      {showModal && (
        <BookingModal
          room={selectedRoom}
          onClose={() => { setShowModal(false); setSelectedRoom(null); }}
          onSuccess={() => selectedFloor && loadRooms(selectedFloor.id)}
        />
      )}
    </DashboardLayout>
  );
}
