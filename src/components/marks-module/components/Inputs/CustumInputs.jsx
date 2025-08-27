import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";

import "./Input.css";

const ClearIcon = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ------------------- Input ------------------- */
export const CustomInput = ({
  label,
  type = "text",
  value = "",
  onChange = () => {},
  placeholder = "",
  required = false,
  id,
  name,
  onClear,
  error,
}) => {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!id && inputRef.current) {
      inputRef.current.id = `input-${Math.random().toString(36).slice(2, 9)}`;
    }
  }, [id]);

  const hasValue = String(value || "").length > 0;

  return (
    <motion.div
      className={`ci-wrapper ${error ? "has-error" : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <label htmlFor={id} className="ci-label">
        {label} {required && <span className="ci-required">*</span>}
      </label>

      <div className={`ci-field ${focused ? "focused" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="ci-input"
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-required={required}
          autoComplete="off"
        />

        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="ci-clear"
            aria-label="Clear input"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {error && <div className="ci-error">{error}</div>}
    </motion.div>
  );
};

/* ------------------- Dropdown ------------------- */
export const CustomDropdown = ({
  label,
  options = [],
  value = "",
  onChange = () => {},
  required = false,
  name,
  onClear,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasValue = String(value || "").length > 0;

  return (
    <motion.div
      className={`ci-wrapper ${error ? "has-error" : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <label className="ci-label">
        {label} {required && <span className="ci-required">*</span>}
      </label>

      <div className={`ci-field dropdown`} ref={ref}>
        <button
          type="button"
          className="ci-input ci-select"
          onClick={() => setOpen((s) => !s)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`ci-select-text ${hasValue ? "filled" : ""}`}>
            {value || "Select..."}
          </span>
          <span className="ci-arrow" aria-hidden>
            <FaChevronDown size={10} />
          </span>
        </button>

        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="ci-clear"
            aria-label="Clear selection"
          >
            <ClearIcon />
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.ul
              className="ci-dropdown"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              role="listbox"
            >
              {options.map((opt, i) => (
                <li
                  key={i}
                  className={`ci-option ${value === opt ? "active" : ""}`}
                  onClick={() => {
                    onChange(name, opt);
                    setOpen(false);
                  }}
                  role="option"
                >
                  {opt}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {error && <div className="ci-error">{error}</div>}
    </motion.div>
  );
};

/* ------------------- Date Picker ------------------- */
export const CustomDatePicker = ({
  label,
  value = "",
  onChange = () => {},
  required = false,
  name,
  onClear,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const today = new Date();
  const start = value ? new Date(value) : today;
  const [currentMonth, setCurrentMonth] = useState(start.getMonth());
  const [currentYear, setCurrentYear] = useState(start.getFullYear());

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const formatted = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <motion.div
      className={`ci-wrapper ${error ? "has-error" : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <label className="ci-label">
        {label} {required && <span className="ci-required">*</span>}
      </label>

      <div className={`ci-field date`} ref={ref}>
        <button
          type="button"
          className="ci-input ci-select"
          onClick={(e) => setOpen((s) => !s)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={`ci-select-text ${value ? "filled" : ""}`}>
            {value || "Select date"}
          </span>
          <span className="ci-arrow" aria-hidden>
            <FaChevronDown size={10} />
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={onClear}
            className="ci-clear"
            aria-label="Clear date"
          >
            <ClearIcon />
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.div
              className="ci-calendar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              role="dialog"
            >
              <div className="ci-cal-head">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentYear((y) => y - 1);
                  }}
                  className="ci-btn"
                  title="Previous Year"
                >
                  «
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentMonth((m) => {
                      if (m === 0) {
                        setCurrentYear((y) => y - 1);
                        return 11;
                      }
                      return m - 1;
                    });
                  }}
                  className="ci-btn"
                  title="Previous Month"
                >
                  ‹
                </button>
                <div className="ci-cal-title">
                  {months[currentMonth]} {currentYear}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentMonth((m) => {
                      if (m === 11) {
                        setCurrentYear((y) => y + 1);
                        return 0;
                      }
                      return m + 1;
                    });
                  }}
                  className="ci-btn"
                  title="Next Month"
                >
                  ›
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentYear((y) => y + 1);
                  }}
                  className="ci-btn"
                  title="Next Month"
                >
                  »
                </button>
              </div>

              <div className="ci-cal-grid">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="ci-cal-day">
                    {d}
                  </div>
                ))}
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    className={`ci-cal-cell ${day ? "clickable" : "empty"} ${
                      day &&
                      currentYear === today.getFullYear() &&
                      currentMonth === today.getMonth() &&
                      day === today.getDate()
                        ? "today"
                        : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!day) return;
                      onChange(name, formatted(currentYear, currentMonth, day));
                      setOpen(false);
                    }}
                  >
                    {day || ""}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <div className="ci-error">{error}</div>}
    </motion.div>
  );
};

/* ------------------- Submit Button ------------------- */
export const SubmitBtn = ({ title }) => (
  <button type="submit" className="submit-btn">
    {title}
  </button>
);
