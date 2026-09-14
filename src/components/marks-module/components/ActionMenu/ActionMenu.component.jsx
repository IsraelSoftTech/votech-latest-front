import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaEllipsisH, FaTimes } from "react-icons/fa";
import "../DataTable/DataTable.styles.css";
import "./ActionMenu.styles.css";

// One "..." button that opens a menu of actions, for page headers and
// cards: the same kebab the DataTable rows use, so Edit / Delete / extras
// look and behave the same everywhere instead of a row of coloured
// buttons (a solid red Delete beside a tinted Edit read as the page's
// primary action, and stacked badly on phones).
//
// items: [{ key, label, icon, onClick, danger, disabled }]
// Desktop: floating menu rendered on top of the page (never clipped).
// Phones: bottom sheet, 48px targets.

const MOBILE_QUERY = "(max-width: 768px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(MOBILE_QUERY).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

function FloatingMenu({ anchorRef, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const place = () => {
      const btn = anchorRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      const r = btn.getBoundingClientRect();
      const mh = menu.offsetHeight;
      const mw = menu.offsetWidth;
      const below = r.bottom + 6 + mh <= window.innerHeight;
      setPos({
        top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - mh),
        left: Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8)),
      });
    };
    place();
    window.addEventListener("resize", place);
    const openedAt = Date.now();
    const onScroll = () => {
      if (Date.now() - openedAt > 250) onClose();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [anchorRef, onClose]);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="dt-menu dt-menu-floating"
      role="menu"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden", top: 0, left: 0 }}
    >
      {children}
    </div>,
    document.body
  );
}

export function ActionMenu({ items = [], label = "Actions", title, className = "" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  const menuItems = visible.map((it) => (
    <button
      type="button"
      key={it.key || it.label}
      className={`dt-menu-item${it.danger ? " danger" : ""}`}
      disabled={it.disabled}
      onClick={(e) => {
        e.stopPropagation();
        it.onClick();
        close();
      }}
    >
      {it.icon && <span className="dt-menu-icon">{it.icon}</span>}
      {it.label}
    </button>
  ));

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`dt-icon-btn dt-kebab am-kebab${open ? " on" : ""} ${className}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <FaEllipsisH />
      </button>
      {open && !isMobile && (
        <FloatingMenu anchorRef={btnRef} onClose={close}>
          {menuItems}
        </FloatingMenu>
      )}
      {open &&
        isMobile &&
        createPortal(
          <div className="dt-sheet-overlay" onClick={close} role="presentation">
            <div className="dt-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title || label}>
              <div className="dt-sheet-grab" />
              <div className="dt-sheet-head">
                <span className="dt-sheet-title">{title || label}</span>
                <button type="button" className="dt-icon-btn" onClick={close} aria-label="Close">
                  <FaTimes />
                </button>
              </div>
              <div className="dt-sheet-body">
                <div className="dt-sort-list">{menuItems}</div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default ActionMenu;
