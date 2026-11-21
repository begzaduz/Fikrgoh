import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../store";

/** Admin uchun "⋯" menyusi: tahrirlash va o‘chirish (o‘chirishdan oldin tasdiqlash so‘raladi). */
export function AdminMenu({ onEdit, onDelete, light = false }: { onEdit: () => void; onDelete: () => void; light?: boolean }) {
  const { u } = useApp();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="relative">
      <button aria-label={u("Amallar")} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-11 items-center justify-center rounded-full ${light ? "bg-black/30 text-white" : "text-muted"}`}>
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-44 rounded-2xl border border-line bg-paper p-1 text-ink shadow-lg">
          <button className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-sm" onClick={() => { setOpen(false); onEdit(); }}>
            <Pencil size={16} /> {u("Tahrirlash")}
          </button>
          <button className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 text-sm text-clay" onClick={() => { setOpen(false); setConfirm(true); }}>
            <Trash2 size={16} /> {u("O‘chirish")}
          </button>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-6" role="alertdialog" aria-modal="true" aria-label={u("O‘chirishni tasdiqlang")}>
          <div className="w-full max-w-[340px] rounded-3xl bg-paper p-5 text-ink">
            <h3 className="font-serif text-xl font-bold">{u("O‘chirilsinmi?")}</h3>
            <p className="mt-2 text-sm text-muted">{u("Buni qaytarib bo‘lmaydi.")}</p>
            <div className="mt-4 flex gap-2.5">
              <button className="min-h-[46px] flex-1 rounded-2xl bg-clay font-bold text-onclay" onClick={() => { setConfirm(false); onDelete(); }}>{u("Ha, o‘chirish")}</button>
              <button className="min-h-[46px] flex-1 rounded-2xl bg-sand font-semibold" onClick={() => setConfirm(false)}>{u("Bekor")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
