'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { roomsApi, floorsApi, getApiErrorMessage } from '@/lib/api';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface MapCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  features: string[];
  status: string;
  floorId?: string;
  mapCoords?: MapCoords;
  floor?: { name: string };
}

interface Floor {
  id: string;
  name: string;
}

const ROOM_FEATURES = ['tv', 'projector', 'whiteboard', 'conference', 'phone', 'hdmi'];

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({
    name: '', capacity: 4, features: [] as string[], status: 'available',
    floorId: '', mapCoords: { x: 100, y: 100, width: 150, height: 100 },
  });

  const load = async () => {
    setLoading(true);
    try {
      const [roomsRes, floorsRes] = await Promise.all([roomsApi.list(), floorsApi.list()]);
      setRooms(roomsRes.data);
      setFloors(floorsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await roomsApi.update(editing.id, form);
        toast.success('Đã cập nhật phòng');
      } else {
        await roomsApi.create(form);
        toast.success('Đã thêm phòng mới');
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Lỗi'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa phòng này?')) return;
    try {
      await roomsApi.delete(id);
      toast.success('Đã xóa');
      load();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const startEdit = (room: Room) => {
    setEditing(room);
    setForm({
      name: room.name, capacity: room.capacity, features: room.features || [],
      status: room.status, floorId: room.floorId || '',
      mapCoords: room.mapCoords || { x: 100, y: 100, width: 150, height: 100 },
    });
    setShowForm(true);
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Quản lý phòng</h1>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', capacity: 4, features: [], status: 'available', floorId: '', mapCoords: { x: 100, y: 100, width: 150, height: 100 } }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm phòng
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm text-slate-900">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Tên phòng', 'Sức chứa', 'Tính năng', 'Tầng', 'Trạng thái', 'Thao tác'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-700 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
                    <td className="px-4 py-3 text-slate-600">{room.capacity} người</td>
                    <td className="px-4 py-3 text-slate-500">{room.features?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{room.floor?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        room.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{room.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(room)}
                          className="p-1.5 rounded-lg border border-transparent bg-white text-slate-800 hover:bg-slate-100 hover:text-indigo-700 hover:border-slate-200 transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(room.id)}
                          className="p-1.5 rounded-lg border border-transparent bg-white text-slate-800 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg text-slate-900">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Sửa phòng' : 'Thêm phòng mới'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên phòng</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sức chứa</label>
                  <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="available">Khả dụng</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tầng</label>
                  <select value={form.floorId} onChange={(e) => setForm({ ...form, floorId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Chọn tầng --</option>
                    {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tính năng</label>
                <div className="flex flex-wrap gap-2">
                  {ROOM_FEATURES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, features: form.features.includes(f) ? form.features.filter((x) => x !== f) : [...form.features, f] })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.features.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-300'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vị trí trên bản đồ</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['x', 'y', 'width', 'height'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-slate-500 mb-1">{field}</label>
                      <input
                        type="number"
                        value={form.mapCoords[field]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            mapCoords: { ...form.mapCoords, [field]: +e.target.value },
                          })
                        }
                        className="w-full px-2 py-1.5 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 text-sm font-medium">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium">{editing ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
