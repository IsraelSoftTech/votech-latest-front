import { ID_CARD_PRINT_INLINE_CSS } from "./idCardPrint.styles";
import { ID_CARD_PRINT_PAGE_STYLE } from "./studentPhoto.util";

function absolutizeImageSources(root) {
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    if (src.startsWith("data:") || src.startsWith("http")) return;
    try {
      img.setAttribute("src", new URL(src, window.location.href).href);
    } catch {
      /* keep original */
    }
  });
}

/**
 * Print ID card DOM in an isolated iframe with self-contained CSS.
 */
export function printHtmlElement(element, title = "Print") {
  if (!element) return Promise.reject(new Error("Nothing to print"));

  const clone = element.cloneNode(true);
  absolutizeImageSources(clone);

  const cardCount = clone.querySelectorAll(".sid-card").length;
  if (cardCount === 0) {
    return Promise.reject(new Error("No ID cards found to print"));
  }

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;z-index:99999;opacity:0;pointer-events:none"
    );
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win.document;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
${ID_CARD_PRINT_INLINE_CSS}
${ID_CARD_PRINT_PAGE_STYLE}
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  width: 100%;
}
body {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>
</head>
<body></body>
</html>`);
    doc.close();

    doc.body.appendChild(clone);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    const doPrint = () => {
      try {
        const imgs = doc.querySelectorAll("img");
        let pending = imgs.length;

        let triggered = false;

        const trigger = () => {
          if (triggered) return;
          triggered = true;
          win.focus();
          win.print();
          cleanup();
          resolve();
        };

        if (pending === 0) {
          trigger();
          return;
        }

        const done = () => {
          pending -= 1;
          if (pending <= 0) trigger();
        };

        imgs.forEach((img) => {
          if (img.complete) done();
          else {
            img.onload = done;
            img.onerror = done;
          }
        });

        setTimeout(trigger, 2500);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    setTimeout(doPrint, 500);
  });
}
