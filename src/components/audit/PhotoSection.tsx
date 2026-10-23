import React, { useRef, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type { PhotoSlots, PhotoSlot } from '../../types';

const ANGLES = ['front', 'back', 'left', 'right'] as const;
const ANGLE_META: Record<string, { icon: string; label: string }> = {
  chassis: { icon: '🔢', label: 'Chassis Number' },
  front:   { icon: '🚗', label: 'Front View'     },
  back:    { icon: '🔙', label: 'Back View'       },
  left:    { icon: '◀️', label: 'Left Side'       },
  right:   { icon: '▶️', label: 'Right Side'      },
  damage:  { icon: '🔍', label: 'Damage / Defect' },
};

async function compressImage(file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      const maxW = 1200;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({ base64: dataUrl.split(',')[1], dataUrl, mimeType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Props {
  slots: PhotoSlots;
  onChange: (slots: PhotoSlots) => void;
  missingAngles: string[];
}

function PhotoTile({
  angle, slot, missing, onCapture, onClear,
  fileRef, aspect = 'aspect-[4/3]',
}: {
  angle: string;
  slot: PhotoSlot | null;
  missing: boolean;
  onCapture: () => void;
  onClear: () => void;
  fileRef: (el: HTMLInputElement | null) => void;
  aspect?: string;
}) {
  const meta = ANGLE_META[angle];
  return (
    <div
      className={`relative ${aspect} rounded-xl overflow-hidden cursor-pointer select-none border-2 transition-all
        ${slot    ? 'border-green-500 bg-white'
        : missing ? 'border-red-400 bg-red-50 animate-pulse'
        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400'}`}
      onClick={onCapture}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => {}}
      />
      {slot ? (
        <>
          <img src={slot.dataUrl} alt={meta.label} className="w-full h-full object-cover" />
          <button
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
            onClick={e => { e.stopPropagation(); onClear(); }}
          ><X size={10} /></button>
          <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-1
            ${slot.status === 'done'      ? 'bg-green-600/85 text-white'
            : slot.status === 'uploading' ? 'bg-blue-600/85 text-white'
            : slot.status === 'error'     ? 'bg-red-600/85 text-white'
            :                               'bg-amber-500/85 text-black'}`}>
            {slot.status === 'done' ? '✓ Saved' : slot.status === 'uploading' ? 'Uploading…' : slot.status === 'error' ? '✗ Failed' : '✓ Ready'}
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-2xl">{meta.icon}</span>
            <span className="text-[11px] font-bold text-gray-500 text-center px-1">{meta.label}</span>
            <span className="text-[10px] text-gray-400">Tap to capture</span>
          </div>
          <div className="absolute top-1.5 left-1.5 bg-brand/80 text-white text-[9px] font-bold rounded px-1.5 py-0.5">
            {angle.toUpperCase()}
          </div>
        </>
      )}
    </div>
  );
}

export function PhotoSection({ slots, onChange, missingAngles }: Props) {
  const [damageOpen, setDamageOpen] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, angle: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      const slot: PhotoSlot = { file, ...compressed, status: 'pending' };
      onChange({ ...slots, [angle]: slot });
    } catch {
      console.error('Image compression failed');
    }
  }

  function triggerCapture(angle: string) {
    const input = fileRefs.current[angle];
    if (!input) return;
    // Re-attach onChange each time to ensure it fires
    input.onchange = (e) => handleFile(e as unknown as React.ChangeEvent<HTMLInputElement>, angle);
    input.click();
  }

  function clearSlot(angle: string) {
    onChange({ ...slots, [angle]: null });
  }

  const filledAngles = ANGLES.filter(a => slots[a] !== null).length;
  const chassisDone  = slots.chassis !== null;
  const totalDone    = filledAngles + (chassisDone ? 1 : 0);
  const totalNeeded  = 5; // chassis + 4 angles
  const pct          = Math.round((totalDone / totalNeeded) * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mt-5 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] bg-purple-100">📸</div>
        <div className="flex-1">
          <div className="text-[13px] font-extrabold tracking-tight">Vehicle Photos</div>
          <div className="text-[11px] text-gray-500">Chassis number + 4 angle views mandatory</div>
        </div>
        <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded px-1.5 py-0.5">Required</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-3.5 space-y-3">

        {/* ── Chassis Number photo (full width, wide) ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-bold text-gray-600">🔢 Chassis Number</span>
            {slots.chassis
              ? <span className="text-[10px] text-green-600 font-bold bg-green-50 rounded px-1.5 py-0.5">✓ Captured</span>
              : missingAngles.includes('chassis')
                ? <span className="text-[10px] text-red-600 font-bold bg-red-50 rounded px-1.5 py-0.5">Missing</span>
                : <span className="text-[10px] text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">Mandatory</span>
            }
          </div>
          <div
            className={`relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all
              ${slots.chassis          ? 'border-green-500 bg-white'
              : missingAngles.includes('chassis') ? 'border-red-400 bg-red-50 animate-pulse'
              : 'border-dashed border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400'}`}
            onClick={() => triggerCapture('chassis')}
          >
            <input
              ref={el => { fileRefs.current['chassis'] = el; }}
              type="file" accept="image/*" capture="environment" className="hidden"
            />
            {slots.chassis ? (
              <>
                <img src={slots.chassis.dataUrl} alt="Chassis" className="w-full h-full object-cover" />
                <button
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                  onClick={e => { e.stopPropagation(); clearSlot('chassis'); }}
                ><X size={10} /></button>
                <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-1
                  ${slots.chassis.status === 'done' ? 'bg-green-600/85 text-white'
                  : slots.chassis.status === 'uploading' ? 'bg-blue-600/85 text-white'
                  : slots.chassis.status === 'error' ? 'bg-red-600/85 text-white'
                  : 'bg-amber-500/85 text-black'}`}>
                  {slots.chassis.status === 'done' ? '✓ Saved' : slots.chassis.status === 'uploading' ? 'Uploading…' : slots.chassis.status === 'error' ? '✗ Failed' : '✓ Ready'}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <span className="text-3xl">🔢</span>
                <span className="text-[12px] font-bold text-gray-600">Chassis Number Plate</span>
                <span className="text-[11px] text-gray-400">Tap to capture — ensure number is clearly readable</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            📌 Hold camera steady · Ensure full VIN/chassis number visible · Good lighting
          </p>
        </div>

        {/* ── 4 Angle photos 2×2 ── */}
        <div>
          <div className="text-[11px] font-bold text-gray-600 mb-1.5">🚗 Vehicle Angles</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ANGLES.map(angle => (
              <PhotoTile
                key={angle}
                angle={angle}
                slot={slots[angle]}
                missing={missingAngles.includes(angle)}
                onCapture={() => triggerCapture(angle)}
                onClear={() => clearSlot(angle)}
                fileRef={el => { fileRefs.current[angle] = el; }}
              />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold ${pct === 100 ? 'text-green-600' : 'text-gray-500'}`}>
            {totalDone === totalNeeded ? '✓ All done' : `${totalDone} / ${totalNeeded}`}
            {slots.damage ? ' + damage' : ''}
          </span>
        </div>

        {/* Damage photo toggle */}
        <button
          className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-[1.5px] border-dashed text-[12px] font-bold transition-all
            ${damageOpen ? 'border-red-300 bg-red-50 text-red-600' : 'border-yellow-400 bg-yellow-50 text-yellow-700'}`}
          onClick={() => {
            setDamageOpen(!damageOpen);
            if (damageOpen) clearSlot('damage');
          }}
        >
          <span className="text-base">⚠️</span>
          <span className="flex-1 text-left">
            {damageOpen ? 'Remove Damage Photo' : 'Add Damage / Defect Close-up'}
            <span className="ml-1 font-normal text-[10px] opacity-70">(optional)</span>
          </span>
          {damageOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {damageOpen && (
          <div>
            <div
              className={`relative w-full aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                ${slots.damage ? 'border-green-500 bg-white' : 'border-dashed border-gray-300 bg-gray-50 hover:bg-orange-50 hover:border-orange-400'}`}
              onClick={() => triggerCapture('damage')}
            >
              <input
                ref={el => { fileRefs.current['damage'] = el; }}
                type="file" accept="image/*" capture="environment" className="hidden"
              />
              {slots.damage ? (
                <>
                  <img src={slots.damage.dataUrl} alt="Damage" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                    onClick={e => { e.stopPropagation(); clearSlot('damage'); }}
                  ><X size={10} /></button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">🔍</span>
                  <span className="text-[11px] font-bold text-gray-500">Damage / Defect Area</span>
                  <span className="text-[10px] text-gray-400">Tap to capture close-up</span>
                </div>
              )}
            </div>
            <p className="text-center text-[11px] text-yellow-700 mt-1.5">
              📌 Dent · wiring · charger port · any defect close-up
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
