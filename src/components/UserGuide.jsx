import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaAlignLeft,
  FaDownload,
  FaExternalLinkAlt,
  FaFileAlt,
  FaLink,
  FaSearch,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import api from "../services/api";
import "./UserGuide.css";

const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "text", label: "Notes" },
  { value: "document", label: "Documents" },
  { value: "video", label: "Videos" },
  { value: "link", label: "Links" },
];

const TYPE_META = {
  text: { icon: <FaAlignLeft />, label: "Note", tone: "note" },
  document: { icon: <FaFileAlt />, label: "Document", tone: "doc" },
  video: { icon: <FaVideo />, label: "Video", tone: "video" },
  link: { icon: <FaLink />, label: "Link", tone: "link" },
};

const NEW_FOR_DAYS = 14;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isNew(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

function GuideViewer({ guide, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!guide) return null;

  const meta = TYPE_META[guide.content_type] || TYPE_META.text;

  return (
    <div className="ug-modal-overlay" onClick={onClose}>
      <div
        className={`ug-modal ${guide.content_type === "text" ? "" : "ug-modal-wide"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ug-modal-header">
          <div className={`ug-chip ug-chip-${meta.tone}`}>{meta.icon}</div>
          <div className="ug-modal-heading">
            <h3>{guide.title}</h3>
            {guide.description && <p>{guide.description}</p>}
          </div>
          <button type="button" className="ug-modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="ug-modal-body">
          {guide.loading && <div className="ug-modal-loading">Loading…</div>}

          {/* Rendered as plain text, never as HTML, so a guide can never
              inject markup or script into another user's page. */}
          {!guide.loading && guide.content_type === "text" && (
            <div className="ug-text-body">{guide.body}</div>
          )}

          {!guide.loading && guide.content_type === "document" && (
            <iframe className="ug-frame" src={guide.file_url} title={guide.title} />
          )}

          {!guide.loading && guide.content_type === "video" && (
            <video className="ug-video" src={guide.file_url} controls preload="metadata">
              Your browser cannot play this video.
            </video>
          )}

          {!guide.loading && guide.content_type === "link" && (
            <div className="ug-link-body">
              <p>This guide is hosted outside the system.</p>
              <a
                className="ug-btn ug-btn-primary"
                href={guide.external_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaExternalLinkAlt /> Open the guide
              </a>
              <span className="ug-link-url">{guide.external_url}</span>
            </div>
          )}
        </div>

        <div className="ug-modal-footer">
          <span className="ug-modal-meta">
            {guide.created_by_name ? `Posted by ${guide.created_by_name}` : ""}
            {guide.created_at ? ` · ${formatDate(guide.created_at)}` : ""}
          </span>
          {["document", "video"].includes(guide.content_type) && guide.file_url && (
            <a
              className="ug-btn ug-btn-primary"
              href={api.getUserGuideDownloadUrl(guide.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaDownload /> Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Also rendered as a tab inside the Admin3 management page, where the
 * surrounding page already supplies a header and padding (embedded) and the
 * library should show only what is actually live (publishedOnly).
 */
export default function UserGuide({ embedded = false, publishedOnly = false }) {
  const [guides, setGuides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  const [active, setActive] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadGuides = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api.getUserGuides({
        search: appliedSearch,
        category,
        type,
        published: publishedOnly ? "true" : "",
      });
      setGuides(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Could not load the guides");
      setGuides([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, category, type, publishedOnly]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  useEffect(() => {
    api
      .getUserGuideCategories()
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  const openGuide = async (guide) => {
    // The list response leaves out the body to stay light, so a note needs a
    // second fetch; opening also records the view server-side.
    setActive({ ...guide, loading: true });
    try {
      const full = await api.getUserGuide(guide.id);
      setActive({ ...full, loading: false });
    } catch (err) {
      setActive(null);
      toast.error(err.message || "Could not open that guide");
    }
  };

  const hasFilters = Boolean(appliedSearch || category || type);

  const emptyMessage = useMemo(() => {
    if (hasFilters) return "No guides match your search.";
    return "No guides have been published for your account yet.";
  }, [hasFilters]);

  return (
    <div className={`ug-page ${embedded ? "ug-embedded" : ""}`}>
      {!embedded && (
        <div className="ug-header">
          <div>
            <h2 className="ug-title">User Guide</h2>
            <p className="ug-subtitle">
              Help and instructions published for your account.
            </p>
          </div>
        </div>
      )}

      <div className="ug-toolbar">
        <div className="ug-search">
          <FaSearch />
          <input
            type="text"
            value={search}
            placeholder="Search guides"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <FaTimes />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <select
            className="ug-select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}

        <div className="ug-type-filters">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className={`ug-pill ${type === filter.value ? "active" : ""}`}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="ug-grid">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="ug-card ug-card-skeleton">
              <div className="ug-skel ug-skel-chip" />
              <div className="ug-skel-body">
                <div className="ug-skel ug-skel-line" />
                <div className="ug-skel ug-skel-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="ug-empty">
          <p>{error}</p>
          <button type="button" className="ug-btn ug-btn-primary" onClick={loadGuides}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && guides.length === 0 && (
        <div className="ug-empty">
          <p>{emptyMessage}</p>
        </div>
      )}

      {!loading && !error && guides.length > 0 && (
        <div className="ug-grid">
          {guides.map((guide) => {
            const meta = TYPE_META[guide.content_type] || TYPE_META.text;
            return (
              <button
                key={guide.id}
                type="button"
                className="ug-card"
                onClick={() => openGuide(guide)}
              >
                <div className={`ug-chip ug-chip-${meta.tone}`}>{meta.icon}</div>
                <div className="ug-card-body">
                  <div className="ug-card-top">
                    <span className="ug-card-title">{guide.title}</span>
                    {isNew(guide.created_at) && <span className="ug-new">New</span>}
                  </div>
                  {guide.description && (
                    <span className="ug-card-desc">{guide.description}</span>
                  )}
                  <span className="ug-card-meta">
                    {meta.label}
                    {guide.category ? ` · ${guide.category}` : ""}
                    {guide.file_size ? ` · ${formatSize(guide.file_size)}` : ""}
                    {guide.created_at ? ` · ${formatDate(guide.created_at)}` : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <GuideViewer guide={active} onClose={() => setActive(null)} />
    </div>
  );
}
