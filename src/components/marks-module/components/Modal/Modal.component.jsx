import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import "./Modal.styles.css";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
};

export default function Modal({ isOpen, onClose, title, children, icon }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="clean-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="clean-modal-container"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clean-modal-title"
          >
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

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
