import React, { useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import { askAI } from '../../lib/ai';

interface Props {
  // Builds the (already de-identified) prompt to send when the user clicks Generate.
  buildPrompt: () => string;
  title?: string;
  label?: string;
}

const AICopilot: React.FC<Props> = ({ buildPrompt, title = 'AI Clinical Summary', label = 'AI Summary' }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult('');
    try {
      setResult(await askAI(buildPrompt()));
    } catch (e: any) {
      setError(e.message || 'Failed to reach the AI service.');
    } finally {
      setLoading(false);
    }
  };

  const openAndRun = () => { setOpen(true); run(); };

  return (
    <>
      <button onClick={openAndRun} className="btn px-3 py-2 text-xs bg-gradient-to-r from-violet-600 to-bwz-primary text-white hover:opacity-90">
        <Sparkles size={14} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-bwz-primary text-white flex items-center justify-center"><Sparkles size={15} /></span>
                {title}
              </h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {loading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
                  <Loader2 size={18} className="animate-spin" /> Thinking…
                </div>
              )}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
                </div>
              )}
              {result && <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result}</div>}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">De-identified · AI can be wrong — verify clinically</span>
              <button onClick={run} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AICopilot;
