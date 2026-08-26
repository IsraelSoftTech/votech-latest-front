import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** ISO ID-1 landscape — matches StudentIdCardPrint.css */
const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;
const PAGE_MARGIN_MM = 8;
const COL_GAP_MM = 8;
const ROW_GAP_MM = 4;
const CARDS_PER_PAGE = 10;

function waitForImages(root, timeoutMs = 10000) {
  const imgs = [...root.querySelectorAll("img")];
  if (!imgs.length) return Promise.resolve();

  return Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.onload = done;
            img.onerror = done;
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function cardPosition(slotIndex) {
  const col = slotIndex % 2;
  const row = Math.floor(slotIndex / 2);
  return {
    x: PAGE_MARGIN_MM + col * (CARD_W_MM + COL_GAP_MM),
    y: PAGE_MARGIN_MM + row * (CARD_H_MM + ROW_GAP_MM),
  };
}

/**
 * Render ID card DOM to a multi-page A4 PDF and trigger instant download.
 */
export async function downloadIdCardsPdf(
  rootElement,
  filename = "Student-ID-Cards.pdf"
) {
  if (!rootElement) {
    throw new Error("Nothing to download");
  }

  const cards = [...rootElement.querySelectorAll(".sid-card")];
  if (!cards.length) {
    throw new Error("No ID cards found");
  }

  await waitForImages(rootElement);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let i = 0; i < cards.length; i += 1) {
    const slot = i % CARDS_PER_PAGE;
    if (i > 0 && slot === 0) {
      pdf.addPage();
    }

    const { x, y } = cardPosition(slot);

    const canvas = await html2canvas(cards[i], {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.94);
    pdf.addImage(imgData, "JPEG", x, y, CARD_W_MM, CARD_H_MM);
  }

  pdf.save(filename);
}

export default downloadIdCardsPdf;
