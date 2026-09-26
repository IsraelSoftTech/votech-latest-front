import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import logo from "../assets/logo.png";
import { DEFAULT_ID_CARD_SETTINGS } from "../utils/studentPhoto.util";
import "./StudentIdCardPrint.css";

function formatDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CardPhoto({ student, photoSrc }) {
  const [imgError, setImgError] = useState(false);
  const initial = student?.full_name
    ? student.full_name.charAt(0).toUpperCase()
    : "?";

  if (photoSrc && !imgError) {
    return (
      <img
        src={photoSrc}
        alt=""
        className="sid-photo-img"
        onError={() => setImgError(true)}
      />
    );
  }

  return <div className="sid-photo-fallback">{initial}</div>;
}

function DetailItem({ label, value, wrap = false }) {
  return (
    <div className={`sid-detail-item${wrap ? " sid-detail-item--wrap" : ""}`}>
      <span className="sid-detail-label">{label}</span>
      <span className="sid-detail-value">{value || "—"}</span>
    </div>
  );
}

function joinParts(parts) {
  const text = parts.map((part) => String(part || "").trim()).filter(Boolean);
  return text.join(" · ");
}

/**
 * Landscape student ID card — ISO ID-1 proportions (85.6mm × 53.98mm).
 */
export function StudentIdCardPrint({
  student,
  settings: settingsProp,
  photoSrc = null,
  showCropMarks = false,
  forPrint = false,
}) {
  const settings = { ...DEFAULT_ID_CARD_SETTINGS, ...(settingsProp || {}) };

  const qrValue = useMemo(() => {
    if (!student?.qr_token) return "";
    return String(student.qr_token);
  }, [student?.qr_token]);

  if (!student) return null;

  return (
    <div
      className={`sid-card-outer ${showCropMarks ? "sid-card-outer--crop" : ""} ${
        forPrint ? "sid-card-outer--print" : ""
      }`}
    >
      <article
        className={`sid-card${settings.stamp_src ? " sid-card--has-stamp" : ""}`}
        aria-label={`ID card for ${student.full_name}`}
      >
        <div className="sid-card-frame" aria-hidden="true" />
        <div className="sid-card-texture" aria-hidden="true" />
        <div className="sid-card-texture-fine" aria-hidden="true" />
        <div className="sid-card-watermark" aria-hidden="true">
          <img src={logo} alt="" className="sid-card-watermark-logo" />
        </div>

        <header className="sid-card-header">
          <div className="sid-card-header-accent" aria-hidden="true" />
          <div className="sid-card-header-left">
            <div className="sid-card-logo-wrap">
              <img src={logo} alt="" className="sid-card-logo" />
            </div>
            <div className="sid-card-school-block">
              <h2 className="sid-card-school-name">{settings.school_name}</h2>
              <p className="sid-card-motto">{settings.motto}</p>
            </div>
          </div>
          <div className="sid-card-header-right">
            <span className="sid-card-motto-side">{settings.motto_fr}</span>
            <span className="sid-card-motto-side sid-card-motto-side--en">
              {settings.motto_en}
            </span>
          </div>
        </header>

        <div className="sid-card-title-bar">
          <span className="sid-card-title-text">{settings.card_title}</span>
        </div>

        <div className="sid-card-body">
          <aside className="sid-card-left-col">
            <div className="sid-photo-frame">
              <CardPhoto student={student} photoSrc={photoSrc} />
            </div>
            <div className="sid-card-qr-block">
              {qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={40}
                  level="M"
                  includeMargin={false}
                  className="sid-card-qr"
                />
              ) : (
                <div className="sid-card-qr-placeholder">QR</div>
              )}
              <span className="sid-card-qr-caption">{settings.qr_caption}</span>
            </div>
          </aside>

          <div className="sid-card-details">
            <div className="sid-name-strip">
              <span className="sid-name-label">Name</span>
              <span className="sid-name-value">{student.full_name}</span>
            </div>

            <div className="sid-details-grid">
              <DetailItem label="Student ID" value={student.student_id} />
              <DetailItem label="Class" value={student.class_name} />
              <DetailItem label="Department" value={student.specialty_name} />
              <DetailItem label="Academic Year" value={student.academic_year_name} />
            </div>

            <div className="sid-bio-row">
              <DetailItem label="Sex" value={student.sex} />
              <DetailItem label="DOB" value={formatDate(student.date_of_birth)} />
            </div>

            <div className="sid-origin-row">
              <DetailItem label="POB" wrap value={student.place_of_birth} />
              <DetailItem label="Father" wrap value={student.father_name} />
            </div>

            <div className="sid-family-row">
              <DetailItem
                label="Mother"
                wrap
                value={joinParts([student.mother_name, student.mother_contact])}
              />
              <DetailItem
                label="Guardian"
                wrap
                value={joinParts([student.guardian_name, student.guardian_contact])}
              />
            </div>

            <div className="sid-card-bottom">
              <div className="sid-details-footer">
                <DetailItem label="Card No." value={student.card_number} />
                <DetailItem
                  label="Date Issued"
                  value={formatDate(settings.date_issued)}
                />
                <DetailItem
                  label="Expiry Date"
                  value={formatDate(settings.expiry_date)}
                />
              </div>
              {settings.stamp_src ? (
                <div className="sid-card-stamp">
                  <img
                    src={settings.stamp_src}
                    alt=""
                    className="sid-card-stamp-img"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sid-card-footer-strip" aria-hidden="true">
          <span className="sid-footer-text">
            VOTECH S7 ACADEMY || Powered by Izzy Tech Team (+237 675644383)
          </span>
        </div>
      </article>
    </div>
  );
}

export default StudentIdCardPrint;
