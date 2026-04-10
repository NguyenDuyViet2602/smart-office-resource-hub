'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { equipmentApi } from '@/lib/api';
import { Plus, Pencil, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@/lib/api';

const EQUIPMENT_TYPES = ['phone', 'laptop', 'tablet', 'camera', 'projector', 'headset', 'other'];
const STATUS_OPTIONS = ['available', 'borrowed', 'maintenance', 'retired'];

interface EquipmentRow {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  status: string;
  location?: string;
  description?: string;
  yoloLabels?: string[];
}

export default function AdminEquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipmentRow | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'other', serialNumber: '', status: 'available',
    location: '', description: '', yoloLabels: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await equipmentApi.list();
      setEquipment(res.data.data ?? res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await equipmentApi.update(editing.id, form);
        toast.success('Đã cập nhật thiết bị');
      } else {
        await equipmentApi.create(form);
        toast.success('Đã thêm thiết bị mới');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Lỗi'));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Quản lý thiết bị</h1>
          <button
            onClick={() => { setEditing(null); setForm({ name: '', type: 'other', serialNumber: '', status: 'available', location: '', description: '', yoloLabels: [] }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm thiết bị
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-900 bg-white min-w-[680px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Tên', 'Loại', 'Serial', 'Vị trí', 'Trạng thái', 'Đang mượn', 'Thao tác'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-slate-700 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{eq.name}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{eq.type}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{eq.serialNumber || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{eq.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        eq.status === 'available' ? 'bg-green-100 text-green-700' :
                        eq.status === 'borrowed' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{eq.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{eq.currentBorrower?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditing(eq); setForm({ name: eq.name, type: eq.type, serialNumber: eq.serialNumber || '', status: eq.status, location: eq.location || '', description: eq.description || '', yoloLabels: eq.yoloLabels || [] }); setShowForm(true); }}
                          className="p-1.5 rounded-lg border border-transparent bg-white text-slate-800 hover:bg-slate-100 hover:text-indigo-700 hover:border-slate-200 transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg text-slate-900">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Sửa thiết bị' : 'Thêm thiết bị'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên thiết bị</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số Serial</label>
                  <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vị trí</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">YOLO Labels (phân cách bởi dấu phẩy)</label>
                  <input
                    value={form.yoloLabels.join(',')}
                    onChange={(e) => setForm({ ...form, yoloLabels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="cell phone, smartphone, iPhone"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 text-sm font-medium">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500">{editing ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
