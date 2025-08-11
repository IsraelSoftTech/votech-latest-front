import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./Input.css";
import { FaChevronDown } from "react-icons/fa";

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
}) => {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!id && inputRef.current)
      inputRef.current.id = `input-${Math.random().toString(36).slice(2, 9)}`;
  }, [id]);

  const hasValue = String(value || "").length > 0;

  return (
    <motion.div
      className="ci-wrapper"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* External label */}
      <label className="ci-external-label">
        <span className="ci-external-text">
          {label} {required && <span className="ci-required">*</span>}
        </span>
      </label>

      <div className={`ci-field ${focused || hasValue ? "active" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(name, e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="ci-input"
          aria-required={required}
          autoComplete="off"
          placeholder={placeholder}
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
    </motion.div>
  );
};

export const CustomDropdown = ({
  label,
  options = [],
  value = "",
  onChange = () => {},
  required = false,
  name,
  onClear,
}) => {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
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
      className="ci-wrapper"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <label className="ci-external-label">
        <span className="ci-external-text">
          {label} {required && <span className="ci-required">*</span>}
        </span>
      </label>

      <div
        className={`ci-field dropdown ${open ? "open" : ""} ${
          focused ? "focused" : ""
        }`}
        ref={ref}
      >
        <button
          type="button"
          className="ci-input ci-select"
          onClick={(e) => {
            e.preventDefault();
            setOpen((s) => !s);
          }}
          onFocus={(e) => {
            e.preventDefault();
            setFocused(true);
          }}
          onBlur={(e) => {
            e.preventDefault();
            setFocused(false);
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`ci-select-text ${hasValue ? "filled" : ""}`}>
            {value || "Select..."}
          </span>
          <span className="ci-arrow" aria-hidden>
            <FaChevronDown size={9} />
          </span>
        </button>

        {/* {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="ci-clear"
            aria-label="Clear selection"
          >
            <ClearIcon />
          </button>
        )} */}

        <AnimatePresence>
          {open && (
            <motion.ul
              className="ci-dropdown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              role="listbox"
            >
              {options.map((opt, i) => (
                <li
                  key={i}
                  className="ci-option"
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
    </motion.div>
  );
};

export const CustomDatePicker = ({
  label,
  value = "",
  onChange = () => {},
  required = false,
  name,
  onClear,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const months = [
    "Jan",
    "Feb",
    "March",
    "April",
    "May",
    "June",
    "July",
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

  const onCellKey = (e, day) => {
    if (!day) return;
    if (e.key === "Enter" || e.key === " ") {
      onChange(formatted(currentYear, currentMonth, day));
      setOpen(false);
    }
  };

  return (
    <motion.div
      className="ci-wrapper"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <label className="ci-external-label">
        <span className="ci-external-text">
          {label} {required && <span className="ci-required">*</span>}
        </span>
      </label>

      <div className={`ci-field date ${open ? "open" : ""}`} ref={ref}>
        <button
          type="button"
          className="ci-input ci-select"
          onClick={() => setOpen((s) => !s)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open date picker"
        >
          <span className={`ci-select-text ${value ? "filled" : ""}`}>
            {value || "Select date"}
          </span>
          <span className="ci-arrow" aria-hidden>
            <FaChevronDown size={9} />
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              className="ci-calendar"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              role="dialog"
              aria-modal="false"
            >
              <div className="ci-cal-head">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentYear((y) => y - 1);
                  }}
                  className="ci-cal-btn"
                  aria-label="Previous year"
                >
                  «
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
                    if (currentMonth === 0) {
                      setCurrentYear((y) => y - 1);
                    }
                  }}
                  className="ci-cal-btn"
                  aria-label="Previous month"
                >
                  ‹
                </button>

                <div className="ci-cal-title">
                  {currentYear} — {months[currentMonth]}
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentMonth((m) => (m === 11 ? 0 : m + 1));
                    if (currentMonth === 11) {
                      setCurrentYear((y) => y + 1);
                    }
                  }}
                  className="ci-cal-btn"
                  aria-label="Next month"
                >
                  ›
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentYear((y) => y + 1);
                  }}
                  className="ci-cal-btn"
                  aria-label="Next year"
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
                {days.map((day, idx) => {
                  const isToday =
                    day &&
                    currentYear === today.getFullYear() &&
                    currentMonth === today.getMonth() &&
                    day === today.getDate();
                  return (
                    <button
                      key={idx}
                      className={`ci-cal-cell ${day ? "clickable" : "empty"} ${
                        isToday ? "today" : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!day) return;
                        onChange(
                          name,
                          formatted(currentYear, currentMonth, day)
                        );
                        setOpen(false);
                      }}
                      onKeyDown={(e) => onCellKey(e, day)}
                      tabIndex={day ? 0 : -1}
                      aria-label={
                        day
                          ? `Select ${day} ${currentMonth + 1} ${currentYear}`
                          : undefined
                      }
                    >
                      {day || ""}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const SubmitBtn = ({ title }) => {
  return <button className="submit-btn">{title}</button>;
};
