import React from "react";
import "./Button.styles.css";

// One button for every marks-module action, replacing the ~30 separately
// defined "-btn-create"/"-btn-primary"/"-btn-download" CSS blocks (one
// per page, often several colors per page) that all drew the same shape.
// A future style change happens here once and cascades everywhere,
// instead of needing a separate edit per page.
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  as,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "vt-btn",
    `vt-btn-${variant}`,
    size !== "md" ? `vt-btn-${size}` : "",
    fullWidth ? "vt-btn-full" : "",
    loading ? "vt-btn-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && <span className="vt-btn-icon">{icon}</span>}
      {children && <span className="vt-btn-label">{children}</span>}
    </>
  );

  const Tag = as || "button";
  const tagProps =
    Tag === "button"
      ? { type: rest.type || "button", disabled: disabled || loading }
      : { "aria-disabled": disabled || loading };

  return (
    <Tag className={classes} {...tagProps} {...rest}>
      {content}
    </Tag>
  );
}

export default Button;
