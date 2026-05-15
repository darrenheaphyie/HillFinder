import { useEffect, type ReactNode } from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
      />
      <div className="relative w-full bg-bg-elev rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex flex-col items-center pt-2 pb-3 border-b border-line shrink-0">
          <span
            aria-hidden="true"
            className="block w-10 h-1.5 rounded-full bg-line-2 mb-2"
          />
          <div className="w-full flex items-center justify-between px-4">
            <h3 className="font-serif text-xl text-ink">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -mr-2 text-ink-3 hover:text-ink"
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  );
}
