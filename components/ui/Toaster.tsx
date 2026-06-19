import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToasts, toast, ToastItem } from '../../lib/toast';

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  error: <AlertCircle size={18} className="text-rose-500" />,
  info: <Info size={18} className="text-sky-500" />,
};

const ACCENT = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-500',
  info: 'border-l-sky-500',
};

const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 w-[min(92vw,360px)] no-print">
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 bg-white/95 backdrop-blur border border-slate-200 border-l-4 ${ACCENT[t.kind]} rounded-xl shadow-pop p-3.5 animate-slide-in-right`}
        >
          <div className="mt-0.5 shrink-0">{ICONS[t.kind]}</div>
          <p className="flex-1 text-sm text-slate-700 leading-snug">{t.message}</p>
          <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
