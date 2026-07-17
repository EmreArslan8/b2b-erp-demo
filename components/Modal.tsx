"use client";

import { X } from "lucide-react";

// Ortak modal sarmalayıcı. .modal-bg/.modal/.modal-head yapısını her yerde tekrar etmeyi önler.
export default function Modal({ title, crumb, onClose, children, className }: { title: string; crumb?: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="modal-bg open"><div className={`modal${className ? ` ${className}` : ""}`}>
    <div className="modal-head"><div>{crumb && <div className="crumb">{crumb}</div>}<h3>{title}</h3></div><button className="icon-btn" type="button" aria-label="Kapat" onClick={onClose}><X className="ic" /></button></div>
    {children}
  </div></div>;
}
