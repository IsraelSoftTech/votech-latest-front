import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import "./Modal.styles.css";

const MOBILE_BREAKPOINT = 480;

// Desktop animations
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const desktopModalVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
};

// Mobile bottom sheet animations
const mobileModalVariants = {
  hidden: { y: "100%", opacity: 1 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 300,
    },
  },
  exit: {
    y: "100%",
    opacity: 1,
    transition: { duration: 0.25, ease: "easeInOut" },
  },
};

export default function Modal({ isOpen, onClose, title, children, icon }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();

  // Ensure component is mounted (for SSR compatibility)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle drag end for swipe-to-dismiss
  const handleDragEnd = (event, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  // Don't render on server or before mount
  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`clean-modal-backdrop ${isMobile ? "mobile" : "desktop"}`}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className={`clean-modal-container ${
              isMobile ? "mobile" : "desktop"
            }`}
            variants={isMobile ? mobileModalVariants : desktopModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clean-modal-title"
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div
                className="modal-drag-handle-container"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="modal-drag-handle" />
              </div>
            )}

            {/* Close button */}
            <button
              className="clean-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              {icon || <FaTimes />}
            </button>

            {title && (
              <p id="clean-modal-title" className="clean-modal-title">
                {title}
              </p>
            )}

            {/* Scrollable content */}
            <div className="clean-modal-scroll">{children}</div>

            {/* Mobile bottom safe area spacer */}
            {isMobile && <div className="modal-safe-area-spacer" />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal directly in document.body
  return createPortal(modalContent, document.body);
}
