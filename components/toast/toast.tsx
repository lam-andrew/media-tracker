"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Check, AlertCircle } from "lucide-react";

type Variant = "default" | "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  variant: Variant;
}
interface ToastContextValue {
  toast: (message: string, variant?: Variant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, variant: Variant = "default") => {
    const id = (idRef.current += 1);
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-ink shadow-lg"
          >
            {t.variant === "success" ? (
              <Check size={15} className="text-accent" />
            ) : t.variant === "error" ? (
              <AlertCircle size={15} className="text-accent-strong" />
            ) : null}
            <span className={t.variant === "error" ? "text-accent-strong" : ""}>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
