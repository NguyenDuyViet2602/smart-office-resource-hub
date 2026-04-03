'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { equipmentApi, aiApi, getApiErrorMessage } from '@/lib/api';
import { Package, Camera, Loader2, X, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  available: { label: 'Có sẵn', color: 'bg-green-100 text-green-700' },
  borrowed: { label: 'Đang mượn', color: 'bg-orange-100 text-orange-700' },
  maintenance: { label: 'Bảo trì', color: 'bg-amber-100 text-amber-700' },
  retired: { label: 'Nghỉ hưu', color: 'bg-slate-100 text-slate-500' },
};

const TYPE_ICONS: Record<string, string> = {
  phone: '📱', laptop: '💻', tablet: '📱', camera: '📷',
  projector: '📽️', headset: '🎧', other: '📦',
};

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: keyof typeof STATUS_CONFIG;
  serialNumber?: string;
  location?: string;
  dueReturnAt?: string;
  currentBorrower?: { name: string };
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCamera, setShowCamera] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [borrowTarget, setBorrowTarget] = useState<Equipment | null>(null);
  const [borrowDue, setBorrowDue] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await equipmentApi.list(filter !== 'all' ? filter : undefined);
      setEquipment(res.data);
    } catch {
      toast.error('Không tải được danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  const openBorrowDialog = (eq: Equipment) => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setBorrowDue(localDateString(d));
    setBorrowTarget(eq);
  };

  const confirmBorrow = async () => {
    if (!borrowTarget || !borrowDue) return;
    const [y, mo, d] = borrowDue.split('-').map(Number);
    const due = new Date(y, mo - 1, d, 23, 59, 59).toISOString();
    setCheckoutId(borrowTarget.id);
    setBorrowTarget(null);
    try {
      await equipmentApi.checkout(borrowTarget.id, due);
      toast.success(`Đã mượn ${borrowTarget.name}`);
      loadEquipment();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Mượn thất bại'));
    } finally {
      setCheckoutId(null);
    }
  };

  const openCamera = async (eq: Equipment) => {
    setSelectedEquipment(eq);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error('Không thể mở camera');
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setSelectedEquipment(null);
  };

  const captureAndDetect = async () => {
    if (!videoRef.current || !selectedEquipment) return;
    setDetecting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

      const res = await aiApi.detect(imageBase64, selectedEquipment.id);
      if (res.data.confirmed) {
        toast.success(`✅ AI xác nhận: ${res.data.label} (${(res.data.confidence * 100).toFixed(0)}%)`);
        closeCamera();
        loadEquipment();
      } else {
        toast.error('AI không nhận diện được thiết bị. Thử lại.');
      }
    } catch {
      toast.error('Lỗi kết nối AI Vision');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thiết bị văn phòng</h1>
            <p className="text-slate-500 mt-1">Mượn và trả thiết bị bằng AI Vision</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border p-1.5 shadow-sm">
            {['all', 'available', 'borrowed', 'maintenance'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === s ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {{ all: 'Tất cả', available: 'Có sẵn', borrowed: 'Đang mượn', maintenance: 'Bảo trì' }[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((eq) => (
              <div key={eq.id} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TYPE_ICONS[eq.type] || '📦'}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{eq.name}</p>
                      {eq.serialNumber && (
                        <p className="text-xs text-slate-400">SN: {eq.serialNumber}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[eq.status]?.color}`}>
                    {STATUS_CONFIG[eq.status]?.label}
                  </span>
                </div>

                {eq.location && (
                  <p className="text-sm text-slate-500 mb-2">📍 {eq.location}</p>
                )}

                {eq.currentBorrower && (
                  <p className="text-sm text-orange-600 mb-2">
                    👤 {eq.currentBorrower.name}
                    {eq.dueReturnAt && ` — Trả: ${new Date(eq.dueReturnAt).toLocaleDateString('vi-VN')}`}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  {eq.status === 'available' && (
                    <button
                      onClick={() => openBorrowDialog(eq)}
                      disabled={checkoutId === eq.id}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {checkoutId === eq.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                      Mượn
                    </button>
                  )}
                  {eq.status === 'borrowed' && (
                    <button
                      onClick={() => openCamera(eq)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Trả bằng AI
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Borrow Dialog */}
      {borrowTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-slate-900">Xác nhận mượn thiết bị</h3>
                <p className="text-sm text-slate-500 mt-0.5">{borrowTarget.name}</p>
              </div>
              <button onClick={() => setBorrowTarget(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Ngày trả thiết bị
                </label>
                <input
                  type="date"
                  value={borrowDue}
                  min={localDateString(new Date())}
                  onChange={(e) => setBorrowDue(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Thiết bị sẽ bị đánh dấu quá hạn nếu chưa trả sau ngày này.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setBorrowTarget(null)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmBorrow}
                  disabled={!borrowDue}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Xác nhận mượn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal for AI verification */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold">Xác nhận trả thiết bị</p>
                <p className="text-sm text-slate-500">{selectedEquipment?.name}</p>
              </div>
              <button onClick={closeCamera} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 border-4 border-green-400 m-8 rounded-xl pointer-events-none opacity-60" />
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                Đưa thiết bị vào khung hình
              </p>
            </div>

            <div className="p-4">
              <button
                onClick={captureAndDetect}
                disabled={detecting}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {detecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang nhận diện...</>
                ) : (
                  <><Camera className="w-4 h-4" /> Chụp và nhận diện</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
