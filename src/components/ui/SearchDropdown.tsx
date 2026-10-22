import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  hint?: string;
  done?: boolean;
}

interface Props {
  options: Option[];
  value: string;
  placeholder?: string;
  summary?: string;
  onChange: (value: string, label: string) => void;
  disabled?: boolean;
}

export function SearchDropdown({ options, value, placeholder, summary, onChange, disabled }: Props) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const [display, setDisplay] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) { setDisplay(''); setQuery(''); }
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function select(opt: Option) {
    setDisplay(opt.label);
    setQuery('');
    setOpen(false);
    onChange(opt.value, opt.label);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setDisplay(''); setQuery('');
    onChange('', '');
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-center border-[1.5px] rounded-xl bg-white overflow-hidden transition-all
                    ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="text"
          className="flex-1 px-3.5 py-2.5 text-sm bg-transparent outline-none"
          placeholder={placeholder || 'Search…'}
          value={open ? query : display}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length) select(filtered[0]);
            if (e.key === 'Escape') setOpen(false);
          }}
          readOnly={disabled}
        />
        {value && (
          <button className="px-2.5 text-gray-400 hover:text-gray-600" onClick={clear}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50
                        bg-white border border-gray-200 rounded-xl
                        shadow-xl max-h-56 overflow-y-auto">
          {summary && (
            <div className="px-3.5 py-2 text-[11px] text-gray-400 italic border-b border-gray-100 bg-gray-50">
              — {summary} —
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-center text-gray-400">No results</div>
          ) : (
            filtered.map(o => (
              <div
                key={o.value}
                className={`px-3.5 py-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-b-0
                            hover:bg-blue-50 active:bg-blue-100
                            ${o.done ? 'text-green-600' : 'text-gray-800'}`}
                onMouseDown={() => select(o)}
              >
                {o.label}
                {o.hint && <span className="ml-1.5 text-[10px] text-gray-400">{o.hint}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
