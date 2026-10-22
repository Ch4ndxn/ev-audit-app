import React, { useEffect } from 'react';

interface Props {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function Toast({ message, visible, onHide, duration = 2800 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onHide, duration);
    return () => clearTimeout(t);
  }, [visible, message, duration, onHide]);

  if (!visible) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
                    bg-gray-900 text-white text-sm font-medium
                    px-5 py-2.5 rounded-full shadow-xl
                    max-w-[88vw] truncate animate-fade-in">
      {message}
    </div>
  );
}
