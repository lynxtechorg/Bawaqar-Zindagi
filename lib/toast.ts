// Tiny dependency-free toast store. A module singleton so it can be called from
// anywhere — React components AND plain functions in the contexts (replacing alert()).

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

const emit = () => listeners.forEach(l => l([...toasts]));

const remove = (id: number) => {
  toasts = toasts.filter(t => t.id !== id);
  emit();
};

const push = (kind: ToastKind, message: string, durationMs = 4000) => {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  if (durationMs > 0) setTimeout(() => remove(id), durationMs);
  return id;
};

export const toast = {
  success: (msg: string) => push('success', msg),
  error: (msg: string) => push('error', msg, 6000),
  info: (msg: string) => push('info', msg),
  dismiss: remove,
};

export const subscribeToasts = (listener: Listener) => {
  listeners.add(listener);
  listener([...toasts]);
  return () => { listeners.delete(listener); };
};
