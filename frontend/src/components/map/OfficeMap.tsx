'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { Users } from 'lucide-react';

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
  mapCoords: MapCoords;
  isBooked?: boolean;
  nextBooking?: { startTime: string; endTime: string };
}

interface OfficeMapProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  selectedRoomId?: string;
}

const FEATURE_ICONS: Record<string, string> = {
  tv: '📺',
  projector: '📽️',
  whiteboard: '🖊️',
  conference: '🎙️',
};

const getRoomColor = (room: Room) => {
  if (room.status === 'maintenance') return { fill: '#f59e0b', stroke: '#d97706', text: '#fff' };
  if (room.status === 'inactive') return { fill: '#94a3b8', stroke: '#64748b', text: '#fff' };
  if (room.isBooked) return { fill: '#ef4444', stroke: '#dc2626', text: '#fff' };
  return { fill: '#22c55e', stroke: '#16a34a', text: '#fff' };
};

export default function OfficeMap({ rooms, onRoomClick, selectedRoomId }: OfficeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ room: Room; x: number; y: number } | null>(null);

  const viewBox = useMemo(() => {
    if (!rooms.length) return '0 0 1000 700';
    const allCoords = rooms.filter((r) => r.mapCoords).map((r) => r.mapCoords);
    if (!allCoords.length) return '0 0 1000 700';
    const minX = Math.min(...allCoords.map((c) => c.x)) - 40;
    const minY = Math.min(...allCoords.map((c) => c.y)) - 40;
    const maxX = Math.max(...allCoords.map((c) => c.x + c.width)) + 40;
    const maxY = Math.max(...allCoords.map((c) => c.y + c.height)) + 40;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [rooms]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, room: Room) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      room,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
    });
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        style={{ background: '#f8fafc' }}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Rooms */}
        {rooms.map((room) => {
          if (!room.mapCoords) return null;
          const { x, y, width, height, shape } = room.mapCoords;
          const colors = getRoomColor(room);
          const isSelected = selectedRoomId === room.id;

          return (
            <g
              key={room.id}
              onClick={() => onRoomClick(room)}
              onMouseEnter={(e) => handleMouseEnter(e, room)}
              onMouseLeave={() => setTooltip(null)}
              className="cursor-pointer"
              style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(99,102,241,0.8))' : undefined }}
            >
              {shape === 'circle' ? (
                <ellipse
                  cx={x + width / 2}
                  cy={y + height / 2}
                  rx={width / 2}
                  ry={height / 2}
                  fill={colors.fill}
                  stroke={isSelected ? '#6366f1' : colors.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  opacity={0.9}
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx={6}
                  fill={colors.fill}
                  stroke={isSelected ? '#6366f1' : colors.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  opacity={0.9}
                />
              )}

              <text
                x={x + width / 2}
                y={y + height / 2 - 8}
                textAnchor="middle"
                fill={colors.text}
                fontSize={Math.min(13, width / 8)}
                fontWeight="600"
                fontFamily="system-ui"
              >
                {room.name}
              </text>
              <text
                x={x + width / 2}
                y={y + height / 2 + 8}
                textAnchor="middle"
                fill={colors.text}
                fontSize={Math.min(11, width / 10)}
                opacity={0.85}
                fontFamily="system-ui"
              >
                {room.capacity} người
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow text-xs space-y-1.5">
        <p className="font-semibold text-slate-700 mb-1">Chú thích</p>
        {[
          { color: 'bg-green-500', label: 'Trống' },
          { color: 'bg-red-500', label: 'Đã đặt' },
          { color: 'bg-amber-500', label: 'Bảo trì' },
          { color: 'bg-slate-400', label: 'Không hoạt động' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-slate-900 text-white rounded-lg p-3 shadow-xl text-xs max-w-[200px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 80 }}
        >
          <p className="font-semibold mb-1">{tooltip.room.name}</p>
          <p className="text-slate-300 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {tooltip.room.capacity} người
          </p>
          {tooltip.room.features?.length > 0 && (
            <p className="text-slate-300 mt-1">
              {tooltip.room.features.map((f) => FEATURE_ICONS[f] || f).join(' ')}
            </p>
          )}
          <p className={`mt-1 font-medium ${tooltip.room.isBooked ? 'text-yellow-400' : 'text-green-400'}`}>
            {tooltip.room.isBooked ? 'Đang có người đặt (bấm để đặt giờ khác)' : 'Còn trống'}
          </p>
        </div>
      )}
    </div>
  );
}
