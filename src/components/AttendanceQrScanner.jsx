import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FaTimes } from "react-icons/fa";
import { parseQrToken } from "../utils/cameroonTimeClient.util";
import "./AttendanceQrScanner.css";

const READER_ID = "attendance-qr-reader";

export default function AttendanceQrScanner({
  open,
  mode,
  onClose,
  onDetected,
}) {
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const lastTokenRef = useRef("");
  const onCloseRef = useRef(onClose);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onCloseRef.current = onClose;
    onDetectedRef.current = onDetected;
  }, [onClose, onDetected]);

  useEffect(() => {
    if (!open) return undefined;

    handledRef.current = false;
    lastTokenRef.current = "";

    let html5Qr = null;
    let mounted = true;

    const stopScanner = async () => {
      if (!html5Qr) return;
      try {
        const state = html5Qr.getState();
        if (state === 2) {
          await html5Qr.stop();
        }
        html5Qr.clear();
      } catch {
        /* ignore */
      }
    };

    const start = async () => {
      html5Qr = new Html5Qrcode(READER_ID);
      scannerRef.current = html5Qr;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1,
        disableFlip: false,
      };

      const onSuccess = (decodedText) => {
        if (handledRef.current) return;
        const token = parseQrToken(decodedText);
        if (!token || token === lastTokenRef.current) return;

        lastTokenRef.current = token;
        handledRef.current = true;
        onDetectedRef.current(token);
      };

      try {
        await html5Qr.start(
          { facingMode: { exact: "environment" } },
          config,
          onSuccess,
          () => {}
        );
      } catch {
        if (!mounted) return;
        try {
          await html5Qr.start(
            { facingMode: "environment" },
            config,
            onSuccess,
            () => {}
          );
        } catch {
          if (mounted) {
            onCloseRef.current({
              error: "Could not access the camera. Allow permission and retry.",
            });
          }
        }
      }
    };

    start();

    return () => {
      mounted = false;
      stopScanner();
      scannerRef.current = null;
    };
  }, [open, mode]);

  if (!open) return null;

  const title = mode === "check_out" ? "Scan Out" : "Scan In";

  return (
    <div className="aqs-overlay" role="dialog" aria-modal="true">
      <div className="aqs-modal">
        <header className="aqs-header">
          <div>
            <h2>{title}</h2>
            <p>Align the student ID QR code inside the frame</p>
          </div>
          <button type="button" className="aqs-close" onClick={() => onClose()} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className="aqs-reader-wrap">
          <div id={READER_ID} className="aqs-reader" />
          <div className="aqs-frame" aria-hidden="true" />
        </div>
        <p className="aqs-hint">Scanning automatically — hold steady for a moment</p>
      </div>
    </div>
  );
}
