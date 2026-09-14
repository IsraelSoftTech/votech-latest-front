import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import SideTop from "../../../SideTop";
import { useRestrictTo } from "../../../../hooks/restrictTo";
import api from "../../utils/api";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { Button } from "../../components/Button/Button.component";
import "./SchoolSettings.styles.css";

const FIELDS = [
  { key: "school_name", label: "School Name" },
  { key: "principal_name", label: "Principal's Name" },
  { key: "contact_phone", label: "Contact Phone" },
  { key: "contact_email", label: "Contact Email" },
  { key: "address", label: "Address" },
  { key: "motto", label: "Motto" },
];

export const SchoolSettingsPage = () => {
  const user = useRestrictTo("Admin1", "Admin3");
  // Fail safe until the role is confirmed: only Admin1 unlocks editing,
  // everyone else (including the brief moment before useRestrictTo
  // resolves) sees a read-only page rather than a briefly-editable one.
  const canEdit = user?.role === "Admin1";
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/school-settings");
        setForm(res.data.data);
      } catch (err) {
        toast.error("Failed to load school settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key, value) => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await api.patch("/school-settings", form);
      setForm(res.data.data);
      toast.success("School settings saved. Every report card, master sheet, and transcript will use these values from now on.");
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.response?.data?.details || "Failed to save school settings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideTop>
      <div className="ssp-page">
        <PageHeader
          title="School Settings"
          subtitle={
            canEdit
              ? "These values are read live by every report card, master sheet, and transcript, change one here and it changes everywhere."
              : "These values are read live by every report card, master sheet, and transcript. View only, only Admin1 can change them."
          }
        />

        <div className="ssp-panel">
          {loading || !form ? (
            // Skeleton shaped like the finished form (one label + input per
            // field, then the save button), same shimmer as the rest of the
            // module, so the page does not jump when the values arrive.
            <div className="ssp-skeleton" aria-busy="true" aria-label="Loading school settings">
              <div className="ssp-form">
                {FIELDS.map((f) => (
                  <div className="ssp-field" key={f.key}>
                    <div className="ssp-skel ssp-skel-label" />
                    <div className="ssp-skel ssp-skel-input" />
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="ssp-actions">
                  <div className="ssp-skel ssp-skel-button" />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="ssp-form">
                {FIELDS.map((f) => (
                  <div className="ssp-field" key={f.key}>
                    <label>{f.label}</label>
                    <input
                      type="text"
                      value={form[f.key] || ""}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      disabled={!canEdit}
                      readOnly={!canEdit}
                    />
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="ssp-actions">
                  <Button onClick={handleSave} disabled={saving} loading={saving}>
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SideTop>
  );
};

export default SchoolSettingsPage;
