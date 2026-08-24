import config from "../config";
import api from "../services/api";

const photoCache = new Map();

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function fetchStudentThumbDataUrl(studentDbId) {
  const id = Number(studentDbId);
  if (!id) return null;

  if (photoCache.has(id)) {
    return photoCache.get(id);
  }

  try {
    const response = await fetch(
      `${config.API_URL}/students/${id}/photo/thumb`,
      { headers: api.getAuthHeaders() }
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    photoCache.set(id, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

export async function preloadStudentPhotoMap(students = []) {
  const map = {};
  await Promise.all(
    students.map(async (student) => {
      const id = student.student_db_id || student.id;
      const hasPhoto = Boolean(student.photo_url || student.photo);
      if (!hasPhoto || !id) return;
      const dataUrl = await fetchStudentThumbDataUrl(id);
      if (dataUrl) map[id] = dataUrl;
    })
  );
  return map;
}

export function getStudentThumbUrl(studentDbId) {
  const id = Number(studentDbId);
  if (!id) return null;
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const base = `${config.API_URL}/students/${id}/photo/thumb`;
  if (!token) return base;
  return `${base}?access_token=${encodeURIComponent(token)}`;
}

export const ID_CARD_PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 8mm;
  }
  @media print {
    html, body {
      width: 100%;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .sid-print-sheet--grid {
      display: grid !important;
      grid-template-columns: repeat(2, 85.6mm) !important;
      column-gap: 8mm !important;
      row-gap: 4mm !important;
      justify-content: center !important;
    }
    .sid-print-sheet--single {
      display: flex !important;
      justify-content: center !important;
    }
    .sid-card {
      width: 85.6mm !important;
      height: 53.98mm !important;
      box-shadow: none !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .sid-print-slot--page-break {
      page-break-after: always !important;
      break-after: page !important;
    }
  }
`;

export const DEFAULT_ID_CARD_SETTINGS = {
  school_name: "VOTECH S7 ACADEMY",
  motto: "Welfare, Productivity, Self Actualization",
  motto_fr: "PAIX - TRAVAIL - PATRIE",
  motto_en: "PEACE - WORK - FATHERLAND",
  card_title: "STUDENT ID CARD",
  qr_caption: "Scan for attendance",
};
