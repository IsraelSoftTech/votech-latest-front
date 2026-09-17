import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FaAlignLeft,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaFileAlt,
  FaLink,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaVideo,
} from "react-icons/fa";
import { useRestrictTo } from "../hooks/restrictTo";
import api from "../services/api";
import {
  GUIDE_VIDEO_MAX_BYTES,
  GUIDE_VIDEO_SOURCE_MAX_BYTES,
  compressGuideVideo,
} from "../utils/compressGuideVideo";
import UserGuide from "./UserGuide";
import "./AdminUserGuides.css";

const ALL_ROLES = "all";

const TYPE_META = {
  text: { icon: <FaAlignLeft />, label: "Note", tone: "note" },
  document: { icon: <FaFileAlt />, label: "Document", tone: "doc" },
  video: { icon: <FaVideo />, label: "Video", tone: "video" },
  link: { icon: <FaLink />, label: "Link", tone: "link" },
};

const TYPE_CHOICES = [
  { value: "text", label: "Written note" },
  { value: "document", label: "Document" },
  { value: "video", label: "Video" },
  { value: "link", label: "External link" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  content_type: "text",
  body: "",
  external_url: "",
  sort_order: 0,
  is_published: true,
  roles: [ALL_ROLES],
  file: null,
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMb(bytes) {
  return `${Math.round((bytes || 0) / (1024 * 1024))}MB`;
}

function extensionOf(name) {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/**
 * Mirrors the server's rules so the admin is told what is wrong before a
 * large upload starts. Videos over 15MB are compressed, not rejected.
 */
function validate(form, limits) {
  if (!form.title.trim()) return "Give the guide a title";
  if (form.title.trim().length > 200) return "The title is too long";
  if (!form.roles.length) return "Choose at least one role that may see this guide";

  if (form.content_type === "text" && !form.body.trim()) {
    return "Write the guide text";
  }

  if (form.content_type === "link") {
    const url = form.external_url.trim();
    if (!url) return "Paste the link to the guide";
    if (!/^https?:\/\//i.test(url)) return "Links must start with http:// or https://";
  }

  if (["document", "video"].includes(form.content_type)) {
    const isDoc = form.content_type === "document";
    const allowed = isDoc ? limits.documentExtensions : limits.videoExtensions;
    const maxBytes = isDoc
      ? limits.documentBytes
      : limits.videoSourceBytes || GUIDE_VIDEO_SOURCE_MAX_BYTES;

    if (!form.file) {
      if (form.existingFileUrl && form.existingType === form.content_type) return "";
      return `Choose the ${form.content_type} to upload`;
    }
    if (!allowed.includes(extensionOf(form.file.name))) {
      return `Allowed file types: ${allowed.join(", ")}`;
    }
    if (form.file.size > maxBytes) {
      return form.content_type === "video"
        ? `Videos larger than ${formatMb(maxBytes)} cannot be processed. Add them as a link instead.`
        : `Documents are limited to ${formatMb(maxBytes)}`;
    }
  }

  return "";
}

function RolePicker({ roles, selected, onChange }) {
  const allSelected = selected.includes(ALL_ROLES);

  const toggleRole = (role) => {
    if (allSelected) return;
    onChange(
      selected.includes(role)
        ? selected.filter((item) => item !== role)
        : [...selected, role]
    );
  };

  return (
    <div className="aug-roles">
      <label className="aug-role aug-role-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChange(allSelected ? [] : [ALL_ROLES])}
        />
        <span>Everyone</span>
      </label>
      <div className="aug-role-grid">
        {roles.map((role) => (
          <label
            key={role}
            className={`aug-role ${allSelected ? "disabled" : ""}`}
          >
            <input
              type="checkbox"
              disabled={allSelected}
              checked={!allSelected && selected.includes(role)}
              onChange={() => toggleRole(role)}
            />
            <span>{role}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminUserGuides() {
  useRestrictTo("Admin3");

  const [tab, setTab] = useState("manage");
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [options, setOptions] = useState({
    roles: [],
    documentExtensions: [],
    videoExtensions: [],
    documentBytes: 20 * 1024 * 1024,
    videoBytes: GUIDE_VIDEO_MAX_BYTES,
    videoSourceBytes: GUIDE_VIDEO_SOURCE_MAX_BYTES,
  });
  const [progressKind, setProgressKind] = useState(null);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");

  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadGuides = useCallback(async () => {
    // The browse tab loads its own list, so skip the admin fetch while it is open.
    if (tab !== "manage") return;

    setLoading(true);
    setError("");
    try {
      const rows = await api.getUserGuides({
        search: appliedSearch,
        published: status,
      });
      setGuides(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Could not load the guides");
      setGuides([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, status, tab]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  useEffect(() => {
    api
      .getUserGuideOptions()
      .then((data) =>
        setOptions({
          roles: data?.roles || [],
          documentExtensions: data?.limits?.documentExtensions || [],
          videoExtensions: data?.limits?.videoExtensions || [],
          documentBytes: data?.limits?.documentBytes || 20 * 1024 * 1024,
          videoBytes: data?.limits?.videoBytes || GUIDE_VIDEO_MAX_BYTES,
          videoSourceBytes: data?.limits?.videoSourceBytes || GUIDE_VIDEO_SOURCE_MAX_BYTES,
        })
      )
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setFormError("");
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (guide) => {
    setFormError("");
    setForm({
      id: guide.id,
      title: guide.title || "",
      description: guide.description || "",
      category: guide.category || "",
      content_type: guide.content_type,
      body: guide.body || "",
      external_url: guide.external_url || "",
      sort_order: guide.sort_order ?? 0,
      is_published: Boolean(guide.is_published),
      roles: Array.isArray(guide.roles) ? guide.roles : [],
      file: null,
      existingFileUrl: guide.file_url || "",
      existingFileName: guide.file_name || "",
      existingType: guide.content_type,
    });
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    const message = validate(form, options);
    if (message) {
      setFormError(message);
      return;
    }

    // Only the content field that matches the chosen type is sent, so
    // switching a guide from a document to a note cannot smuggle both.
    const fields = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      content_type: form.content_type,
      sort_order: form.sort_order,
      is_published: form.is_published,
      roles: form.roles,
    };
    if (form.content_type === "text") fields.body = form.body;
    if (form.content_type === "link") fields.external_url = form.external_url.trim();

    setSaving(true);
    setProgress(null);
    setProgressKind(null);
    try {
      let fileToSend = form.file || null;
      if (
        fileToSend &&
        form.content_type === "video" &&
        fileToSend.size > (options.videoBytes || GUIDE_VIDEO_MAX_BYTES)
      ) {
        setProgressKind("compress");
        setProgress(1);
        fileToSend = await compressGuideVideo(fileToSend, {
          maxBytes: options.videoBytes || GUIDE_VIDEO_MAX_BYTES,
          onProgress: setProgress,
        });
      }
      if (fileToSend) fields.file = fileToSend;

      const payload = api.buildUserGuideFormData(fields);
      const hasFile = Boolean(fileToSend);
      setProgressKind(hasFile ? "upload" : "save");
      setProgress(hasFile ? 0 : 35);

      if (form.id) {
        await api.updateUserGuide(form.id, payload, hasFile ? setProgress : undefined);
        toast.success("Guide updated");
      } else {
        await api.createUserGuide(payload, hasFile ? setProgress : undefined);
        toast.success("Guide published");
      }
      if (hasFile) setProgress(100);
      setForm(null);
      loadGuides();
    } catch (err) {
      setFormError(err.message || "Could not save the guide");
    } finally {
      setSaving(false);
      setProgress(null);
      setProgressKind(null);
    }
  };

  const togglePublished = async (guide) => {
    try {
      await api.toggleUserGuidePublished(guide.id);
      toast.success(guide.is_published ? "Guide hidden" : "Guide published");
      loadGuides();
    } catch (err) {
      toast.error(err.message || "Could not change visibility");
    }
  };

  const remove = async () => {
    const guide = confirmDelete;
    try {
      await api.deleteUserGuide(guide.id);
      toast.success("Guide deleted");
      setConfirmDelete(null);
      loadGuides();
    } catch (err) {
      toast.error(err.message || "Could not delete the guide");
    }
  };

  const needsFile = form && ["document", "video"].includes(form.content_type);
  const accept = useMemo(() => {
    if (!form) return "";
    const list =
      form.content_type === "document"
        ? options.documentExtensions
        : options.videoExtensions;
    return list.map((ext) => `.${ext}`).join(",");
  }, [form, options]);

  return (
    <div className="aug-page">
      <div className="aug-header">
        <div>
          <h2 className="aug-title">User Guides</h2>
          <p className="aug-subtitle">
            Publish help for any role. Guides marked “Everyone” reach every account.
          </p>
        </div>
        {tab === "manage" && (
          <button type="button" className="aug-btn aug-btn-primary" onClick={openCreate}>
            <FaPlus /> New guide
          </button>
        )}
      </div>

      <div className="aug-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "manage"}
          className={`aug-tab ${tab === "manage" ? "active" : ""}`}
          onClick={() => setTab("manage")}
        >
          Manage guides
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "browse"}
          className={`aug-tab ${tab === "browse" ? "active" : ""}`}
          onClick={() => setTab("browse")}
        >
          User guide
        </button>
      </div>

      {tab === "browse" && <UserGuide embedded publishedOnly />}

      {tab === "manage" && (
        <>
          <div className="aug-toolbar">
            <div className="aug-search">
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

            <select
              className="aug-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All guides</option>
              <option value="true">Published</option>
              <option value="false">Drafts</option>
            </select>
          </div>

          <div className="aug-panel">
            {loading && <div className="aug-state">Loading guides…</div>}

            {!loading && error && (
              <div className="aug-state">
                <p>{error}</p>
                <button type="button" className="aug-btn aug-btn-primary" onClick={loadGuides}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && guides.length === 0 && (
              <div className="aug-state">
                <p>No guides yet. Create the first one to help your staff.</p>
              </div>
            )}

            {!loading && !error && guides.length > 0 && (
              <div className="aug-table-wrap">
                <table className="aug-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Visible to</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Created</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {guides.map((guide) => {
                      const meta = TYPE_META[guide.content_type] || TYPE_META.text;
                      const roles = Array.isArray(guide.roles) ? guide.roles : [];
                      return (
                        <tr key={guide.id}>
                          <td>
                            <span className="aug-cell-title">{guide.title}</span>
                            {guide.category && (
                              <span className="aug-cell-sub">{guide.category}</span>
                            )}
                          </td>
                          <td>
                            <span className={`aug-type aug-type-${meta.tone}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </td>
                          <td>
                            <div className="aug-role-chips">
                              {roles.includes(ALL_ROLES) ? (
                                <span className="aug-chip aug-chip-all">Everyone</span>
                              ) : (
                                roles.map((role) => (
                                  <span key={role} className="aug-chip">
                                    {role}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`aug-status ${guide.is_published ? "live" : "draft"}`}
                            >
                              {guide.is_published ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td className="aug-views">{guide.view_count ?? 0}</td>
                          <td className="aug-date">{formatDate(guide.created_at)}</td>
                          <td>
                            <div className="aug-actions">
                              <button
                                type="button"
                                className="aug-icon-btn"
                                title="Edit"
                                onClick={() => openEdit(guide)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className="aug-icon-btn"
                                title={guide.is_published ? "Unpublish" : "Publish"}
                                onClick={() => togglePublished(guide)}
                              >
                                {guide.is_published ? <FaEyeSlash /> : <FaEye />}
                              </button>
                              <button
                                type="button"
                                className="aug-icon-btn danger"
                                title="Delete"
                                onClick={() => setConfirmDelete(guide)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {form && (
        <div className="aug-modal-overlay" onClick={() => !saving && setForm(null)}>
          <div className="aug-modal" onClick={(event) => event.stopPropagation()}>
            <div className="aug-modal-header">
              <h3>{form.id ? "Edit guide" : "New guide"}</h3>
              <button
                type="button"
                className="aug-modal-close"
                onClick={() => setForm(null)}
                disabled={saving}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="aug-modal-body">
                <div className="aug-field">
                  <label htmlFor="aug-title">Title</label>
                  <input
                    id="aug-title"
                    type="text"
                    value={form.title}
                    maxLength={200}
                    onChange={(event) => setField("title", event.target.value)}
                  />
                </div>

                <div className="aug-field">
                  <label htmlFor="aug-desc">Short description</label>
                  <input
                    id="aug-desc"
                    type="text"
                    value={form.description}
                    onChange={(event) => setField("description", event.target.value)}
                  />
                </div>

                <div className="aug-field-row">
                  <div className="aug-field">
                    <label htmlFor="aug-category">Category</label>
                    <input
                      id="aug-category"
                      type="text"
                      value={form.category}
                      placeholder="e.g. Getting Started"
                      onChange={(event) => setField("category", event.target.value)}
                    />
                  </div>
                  <div className="aug-field">
                    <label htmlFor="aug-order">Order</label>
                    <input
                      id="aug-order"
                      type="number"
                      value={form.sort_order}
                      onChange={(event) =>
                        setField("sort_order", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="aug-field">
                  <label>Guide type</label>
                  <div className="aug-type-choices">
                    {TYPE_CHOICES.map((choice) => (
                      <button
                        key={choice.value}
                        type="button"
                        className={`aug-pill ${
                          form.content_type === choice.value ? "active" : ""
                        }`}
                        onClick={() => setField("content_type", choice.value)}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.content_type === "text" && (
                  <div className="aug-field">
                    <label htmlFor="aug-body">Guide text</label>
                    <textarea
                      id="aug-body"
                      rows={8}
                      value={form.body}
                      onChange={(event) => setField("body", event.target.value)}
                    />
                  </div>
                )}

                {form.content_type === "link" && (
                  <div className="aug-field">
                    <label htmlFor="aug-url">Link</label>
                    <input
                      id="aug-url"
                      type="url"
                      value={form.external_url}
                      placeholder="https://"
                      onChange={(event) => setField("external_url", event.target.value)}
                    />
                  </div>
                )}

                {needsFile && (
                  <div className="aug-field">
                    <label htmlFor="aug-file">
                      {form.existingFileUrl && form.existingType === form.content_type
                        ? "Replace file (optional)"
                        : "File"}
                    </label>
                    <input
                      id="aug-file"
                      type="file"
                      accept={accept}
                      onChange={(event) => setField("file", event.target.files[0] || null)}
                    />
                    <span className="aug-hint">
                      {form.content_type === "video"
                        ? `Stored size is ${formatMb(options.videoBytes)}. Larger videos (up to ${formatMb(options.videoSourceBytes)}) are compressed automatically to ${formatMb(options.videoBytes)} at up to 720p. For very long videos, use an external link.`
                        : `Up to ${formatMb(options.documentBytes)}.`}
                    </span>
                    {form.content_type === "video" &&
                      form.file &&
                      form.file.size > (options.videoBytes || GUIDE_VIDEO_MAX_BYTES) && (
                      <span className="aug-hint">
                        This {formatMb(form.file.size)} video will be compressed to {formatMb(options.videoBytes)} before upload.
                      </span>
                    )}
                    {form.existingFileName && !form.file && (
                      <span className="aug-hint">Current file: {form.existingFileName}</span>
                    )}
                  </div>
                )}

                <div className="aug-field">
                  <label>Who can see this guide</label>
                  <RolePicker
                    roles={options.roles}
                    selected={form.roles}
                    onChange={(roles) => setField("roles", roles)}
                  />
                </div>

                <label className="aug-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => setField("is_published", event.target.checked)}
                  />
                  <span>Publish now</span>
                </label>

                {formError && <div className="aug-form-error">{formError}</div>}

                {progressKind && (
                  <div className="aug-progress-wrap">
                    <div className="aug-progress-label">
                      {progressKind === "compress"
                        ? "Compressing video"
                        : progressKind === "upload"
                          ? "Saving video"
                          : "Saving guide"}
                      <strong>{Math.max(0, Math.min(100, progress ?? 0))}%</strong>
                    </div>
                    <div className="aug-progress">
                      <div
                        className="aug-progress-bar"
                        style={{ width: `${Math.max(0, Math.min(100, progress ?? 0))}%` }}
                      />
                    </div>
                    <span className="aug-progress-hint">
                      {progressKind === "compress"
                        ? "Reducing the file to 15MB. Keep this window open until it finishes."
                        : "Uploading the compressed file to the server."}
                    </span>
                  </div>
                )}
              </div>

              <div className="aug-modal-footer">
                <button
                  type="button"
                  className="aug-btn aug-btn-ghost"
                  onClick={() => setForm(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="aug-btn aug-btn-primary" disabled={saving}>
                  {saving
                    ? progressKind === "compress"
                      ? "Compressing…"
                      : progressKind === "upload"
                        ? "Saving…"
                        : "Saving…"
                    : form.id
                      ? "Save changes"
                      : "Create guide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="aug-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="aug-modal aug-modal-sm" onClick={(event) => event.stopPropagation()}>
            <div className="aug-modal-header">
              <h3>Delete guide</h3>
              <button
                type="button"
                className="aug-modal-close"
                onClick={() => setConfirmDelete(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="aug-modal-body">
              <p className="aug-confirm-text">
                Delete “{confirmDelete.title}”? Staff will no longer see it.
              </p>
            </div>
            <div className="aug-modal-footer">
              <button
                type="button"
                className="aug-btn aug-btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button type="button" className="aug-btn aug-btn-danger" onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
