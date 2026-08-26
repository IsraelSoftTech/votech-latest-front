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

export async function fetchStudentThumbDataUrl(studentDbId, size = "card") {
  const id = Number(studentDbId);
  if (!id) return null;

  const cacheKey = `${id}:${size}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey);
  }

  try {
    const params = new URLSearchParams({ size });
    if (size === "card") {
      params.set("generate", "true");
    }
    const response = await fetch(
      `${config.API_URL}/students/${id}/photo/thumb?${params}`,
      { headers: api.getAuthHeaders() }
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    photoCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

export async function buildStudentPhotoMap(students = []) {
  const map = {};
  const needFetch = [];

  for (const student of students) {
    const id = student.student_db_id || student.id;
    if (!id) continue;

    const hasPhoto =
      student.has_photo ?? Boolean(student.photo_url || student.photo);
    if (!hasPhoto) continue;

    if (student.thumb_src) {
      map[id] = student.thumb_src;
      photoCache.set(`${id}:card`, student.thumb_src);
    } else {
      needFetch.push(id);
    }
  }

  if (needFetch.length) {
    await Promise.all(
      needFetch.map(async (id) => {
        const dataUrl = await fetchStudentThumbDataUrl(id, "card");
        if (dataUrl) map[id] = dataUrl;
      })
    );
  }

  return map;
}

export async function preloadStudentPhotoMap(students = []) {
  return buildStudentPhotoMap(students);
}

export function getStudentThumbUrl(studentDbId, size = "list") {
  const id = Number(studentDbId);
  if (!id) return null;
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const params = new URLSearchParams();
  if (size === "card") params.set("size", "card");
  if (token) params.set("access_token", token);
  const query = params.toString();
  const base = `${config.API_URL}/students/${id}/photo/thumb`;
  return query ? `${base}?${query}` : base;
}

export const ID_CARD_SETTINGS_CACHE_KEY = "votech_id_card_settings_v1";

export function readCachedIdCardSettings() {
  try {
    const raw = sessionStorage.getItem(ID_CARD_SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCachedIdCardSettings(settings) {
  try {
    sessionStorage.setItem(
      ID_CARD_SETTINGS_CACHE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    /* ignore */
  }
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
