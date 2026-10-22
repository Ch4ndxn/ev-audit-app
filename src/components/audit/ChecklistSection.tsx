import React from 'react';
import type { ChecklistItem, CheckValue } from '../../types';

interface Props {
  title: string;
  icon: string;
  iconBg: string;
  items: ChecklistItem[];
  values: Record<string, CheckValue>;
  remarks: Record<string, string>;
  onChange: (id: string, val: CheckValue) => void;
  onRemark: (id: string, val: string) => void;
}

export function ChecklistSection({ title, icon, iconBg, items, values, remarks, onChange, onRemark }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mt-5 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[15px] ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-extrabold tracking-tight">{title}</div>
          <div className="text-[11px] text-gray-500">{items.length} checkpoints</div>
        </div>
        <span className="text-[10px] font-bold text-red-500 bg-red-50 rounded px-1.5 py-0.5">Required</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {items.map((item, idx) => {
          const val = values[item.id] || '';
          const state = val === 'OK' ? 'ok' : val === 'Not OK' ? 'bad' : 'none';
          return (
            <div
              key={item.id}
              className={`px-3.5 py-3 border-b border-gray-100 last:border-b-0 transition-colors
                          ${state === 'ok' ? 'bg-green-50/40' : state === 'bad' ? 'bg-red-50/40' : ''}`}
            >
              <div className="flex items-center gap-2">
                {/* Number bubble */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border-[1.5px] transition-all
                                  ${state === 'ok'  ? 'bg-green-100 border-green-500 text-green-700'
                                  : state === 'bad' ? 'bg-red-100 border-red-500 text-red-700'
                                  : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                  {state === 'ok' ? '✓' : state === 'bad' ? '✗' : idx + 1}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-gray-800">{item.label}</span>
                {/* Pills */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {(['OK', 'Not OK', 'N/A'] as CheckValue[]).map(opt => (
                    <label key={opt} className="cursor-pointer">
                      <input
                        type="radio"
                        name={item.id}
                        value={opt}
                        checked={val === opt}
                        onChange={() => onChange(item.id, opt)}
                        className="sr-only"
                      />
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-[1.5px] select-none whitespace-nowrap transition-all
                        ${val === opt && opt === 'OK'     ? 'bg-green-100 border-green-500 text-green-700'
                        : val === opt && opt === 'Not OK' ? 'bg-red-100 border-red-500 text-red-700'
                        : val === opt && opt === 'N/A'    ? 'bg-gray-100 border-gray-400 text-gray-600'
                        : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                        {opt === 'OK' ? '✓ OK' : opt === 'Not OK' ? '✗ Not OK' : 'N/A'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remark field — shown only when Not OK */}
              {val === 'Not OK' && (
                <input
                  type="text"
                  className="mt-2 w-full px-3 py-2 text-[12px] rounded-lg border-[1.5px] border-red-300 bg-red-50 text-red-700 placeholder-red-300 outline-none focus:border-red-400"
                  placeholder="Describe the issue…"
                  value={remarks[item.id] || ''}
                  onChange={e => onRemark(item.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
