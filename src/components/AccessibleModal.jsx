import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export default function AccessibleModal({ title, onClose, children, className = '' }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const host = document.fullscreenElement || document.body;
  useEffect(() => {
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const hostOverflow = host.style.overflow;
    const siblings = [...host.children].filter((node) => !node.contains(panel) && !['SCRIPT', 'STYLE'].includes(node.tagName));
    const inertStates = siblings.map((node) => [node, node.inert]);
    siblings.forEach((node) => { node.inert = true; });
    document.body.style.overflow = 'hidden';
    host.style.overflow = 'hidden';
    const focusable = () => [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter((node) => node.getClientRects().length);
    panel.querySelector('button')?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onFocus = (event) => { if (!panel.contains(event.target)) (focusable()[0] || panel).focus(); };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocus);
      inertStates.forEach(([node, inert]) => { node.inert = inert; });
      host.style.overflow = hostOverflow;
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [host]);
  return createPortal(
    <motion.div className={`set-sheet-backdrop vocab-modal-backdrop ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .15 }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section ref={panelRef} className="set-sheet-panel vocab-modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} initial={reducedMotion ? false : { y: 16 }} animate={{ y: 0 }}>
        <div className="set-sheet-header">
          <h2 id={titleId} className="fs-5 fw-bold mb-0">{title}</h2>
          <button type="button" className="btn-icon-soft chip-slate" aria-label="Đóng" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="vocab-modal-body">{children}</div>
      </motion.section>
    </motion.div>, host,
  );
}
