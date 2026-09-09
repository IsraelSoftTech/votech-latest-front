/**
 * Print iframe styles — keep in sync with StudentIdCardPrint.css
 * (CRA bundles screen CSS separately; print uses this inline copy.)
 */
export const ID_CARD_PRINT_INLINE_CSS = `
.sid-card-outer{display:inline-block;padding:0;vertical-align:top}
.sid-card{position:relative;width:85.6mm;height:53.98mm;box-sizing:border-box;background:linear-gradient(160deg,#fafbfd 0%,#eef3fa 38%,#e4ecf7 100%);border-radius:3mm;overflow:hidden;display:flex;flex-direction:column;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;color:#152238;box-shadow:0 0 0 1px #204080,0 0 0 2.5px #f0f4fa,0 0 0 3.2px #204080}
.sid-card-frame{position:absolute;inset:1.1mm;border:0.35mm solid rgba(32,64,128,0.22);border-radius:2.2mm;pointer-events:none;z-index:2}
.sid-card-texture{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.55;background:radial-gradient(ellipse 80% 60% at 70% 40%,rgba(45,90,168,0.07) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 10% 90%,rgba(32,64,128,0.06) 0%,transparent 60%),repeating-linear-gradient(105deg,transparent,transparent 0.8mm,rgba(32,64,128,0.025) 0.8mm,rgba(32,64,128,0.025) 1.6mm)}
.sid-card-texture-fine{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.4;background:repeating-linear-gradient(0deg,transparent,transparent 0.4mm,rgba(255,255,255,0.35) 0.4mm,rgba(255,255,255,0.35) 0.5mm)}
.sid-card-watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
.sid-card-watermark-logo{width:34mm;height:34mm;object-fit:contain;opacity:0.06;filter:grayscale(30%);box-shadow:none}
.sid-card-header,.sid-card-title-bar,.sid-card-body,.sid-card-footer-strip{position:relative;z-index:3}
.sid-card-header,.sid-card-title-bar,.sid-card-footer-strip{flex-shrink:0}
.sid-card-header{display:flex;align-items:center;justify-content:space-between;gap:1.6mm;padding:0.65mm 1.8mm 0.55mm 1.4mm;background:linear-gradient(180deg,#1e3d7a 0%,#204080 55%,#1a3568 100%);color:#fff;border-bottom:0.4mm solid rgba(255,255,255,0.12);overflow:hidden}
.sid-card-header-accent{position:absolute;inset:0;background:repeating-linear-gradient(-55deg,transparent,transparent 1.5mm,rgba(255,255,255,0.04) 1.5mm,rgba(255,255,255,0.04) 3mm);pointer-events:none}
.sid-card-header-left{display:flex;align-items:center;gap:1.4mm;flex:1;min-width:0}
.sid-card-logo-wrap{flex-shrink:0;padding:0.4mm;background:#fff;border-radius:1.2mm;box-shadow:0 0.5mm 1.2mm rgba(0,0,0,0.2)}
.sid-card-logo{width:6.2mm;height:6.2mm;object-fit:contain;display:block}
.sid-card-school-block{min-width:0}
.sid-card-school-name{margin:0;font-size:6.8pt;font-weight:800;letter-spacing:0.04em;line-height:1.08;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sid-card-motto{margin:0.15mm 0 0;font-size:4.4pt;opacity:0.92;line-height:1.1;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sid-card-motto::before{content:"\\201C"}
.sid-card-motto::after{content:"\\201D"}
.sid-card-header-right{display:flex;flex-direction:column;align-items:flex-end;gap:0.2mm;flex-shrink:0;text-align:right}
.sid-card-motto-side{font-size:4.2pt;font-weight:700;letter-spacing:0.06em;opacity:0.9;white-space:nowrap}
.sid-card-motto-side--en{font-size:3.6pt;opacity:0.72;font-weight:600}
.sid-card-title-bar{text-align:center;background:linear-gradient(180deg,#c8d8ef 0%,#dce8f6 40%,#e8eef8 100%);border-bottom:0.4px solid rgba(32,64,128,0.35);padding:0.28mm 0;position:relative}
.sid-card-title-bar::before,.sid-card-title-bar::after{content:"";position:absolute;top:50%;width:12mm;height:0.3mm;background:linear-gradient(90deg,transparent,#204080,transparent)}
.sid-card-title-bar::before{left:3mm}
.sid-card-title-bar::after{right:3mm}
.sid-card-title-text{font-size:6.2pt;font-weight:800;letter-spacing:0.18em;color:#204080}
.sid-card-body{flex:1 1 auto;min-height:0;overflow:hidden;display:grid;grid-template-columns:15.4mm minmax(0,1fr);grid-template-rows:minmax(0,1fr);align-items:stretch;gap:1.2mm;padding:0.55mm 1.5mm 0.5mm 1.15mm}
.sid-card-left-col{display:flex;flex-direction:column;align-items:stretch;gap:0.45mm;min-width:0;min-height:0;overflow:hidden}
.sid-photo-frame{width:100%;box-sizing:border-box;padding:0.35mm;background:linear-gradient(145deg,#fff 0%,#dce6f5 100%);border:0.4mm solid #204080;border-radius:1mm;box-shadow:inset 0 0 1mm rgba(32,64,128,0.08)}
.sid-photo-img,.sid-photo-fallback{width:100%;height:13.6mm;border-radius:0.5mm;object-fit:cover;background:#dde4f0;display:block}
.sid-photo-fallback{display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:800;color:#204080}
.sid-card-qr-block{display:flex;flex-direction:column;align-items:center;gap:0.15mm;width:100%;box-sizing:border-box;padding:0.3mm;background:rgba(255,255,255,0.65);border:0.3mm solid rgba(32,64,128,0.25);border-radius:0.7mm}
.sid-card-qr{display:block;width:10.2mm!important;height:10.2mm!important;background:#fff}
.sid-card-qr-placeholder{width:10.2mm;height:10.2mm;border:1px dashed #aaa;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#888;background:#fff}
.sid-card-qr-caption{font-size:3pt;font-weight:600;color:#204080;text-align:center;line-height:1;letter-spacing:0.01em}
.sid-card-details{display:flex;flex-direction:column;gap:0.3mm;min-width:0;min-height:0;height:100%;overflow:hidden;border-left:0.35mm solid rgba(32,64,128,0.15);padding-left:1.1mm}
.sid-name-strip{flex-shrink:0;display:flex;flex-direction:column;gap:0.05mm;padding:0.3mm 0.6mm;background:linear-gradient(90deg,rgba(32,64,128,0.12) 0%,rgba(32,64,128,0.04) 100%);border-left:0.55mm solid #204080;border-radius:0 0.7mm 0.7mm 0}
.sid-name-label{font-size:4.5pt;font-weight:700;color:#204080;text-transform:uppercase;letter-spacing:0.08em}
.sid-name-value{font-size:6.6pt;font-weight:800;color:#152238;line-height:1.08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sid-details-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:1.6mm;row-gap:0.22mm;flex:1 1 auto;min-height:0;align-content:start;overflow:hidden}
.sid-detail-item{display:flex;flex-direction:column;gap:0;min-width:0;padding-bottom:0.08mm;border-bottom:0.18mm dotted rgba(32,64,128,0.14)}
.sid-detail-label{font-size:4.1pt;font-weight:700;color:#204080;text-transform:uppercase;letter-spacing:0.03em;line-height:1.05}
.sid-detail-value{font-size:5.5pt;font-weight:600;color:#152238;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sid-card-bottom{flex:0 0 auto;display:flex;align-items:center;gap:1.2mm;min-height:10.2mm;padding-top:0.35mm;margin-top:0.15mm;border-top:0.3mm solid rgba(32,64,128,0.22)}
.sid-details-footer{flex:1 1 auto;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:1.4mm;margin:0;padding:0;border:none;align-content:center}
.sid-details-footer .sid-detail-item{border-bottom:none;padding-bottom:0}
.sid-details-footer .sid-detail-label{font-size:4.1pt}
.sid-details-footer .sid-detail-value{font-size:5.6pt;font-weight:700;color:#204080}
.sid-card-stamp{flex:0 0 10mm;width:10mm;height:10mm;display:flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;background:#fff;border:0.3mm solid #204080;box-shadow:0 0 0 0.25mm #fff,0 0 0 0.48mm rgba(32,64,128,0.5);z-index:4}
.sid-card-stamp-img{width:100%;height:100%;object-fit:contain;object-position:center;display:block;background:#fff;border-radius:50%}
.sid-card:not(.sid-card--has-stamp) .sid-card-bottom{min-height:5.4mm}
.sid-card-footer-strip{height:1.85mm;background:linear-gradient(90deg,#1a3568,#204080 30%,#2d5aa8 70%,#1a3568);flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.sid-footer-text{font-size:2.6pt;font-weight:700;line-height:1;color:rgba(255,255,255,0.92);letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90%}
.sid-print-sheet{background:#fff;box-sizing:border-box;width:100%}
.sid-print-sheet--grid{display:grid;grid-template-columns:repeat(2,85.6mm);column-gap:8mm;row-gap:4mm;justify-content:center;align-content:start}
.sid-print-sheet--single{display:flex;justify-content:center;align-items:flex-start;width:100%}
.sid-print-slot{width:85.6mm;height:53.98mm;break-inside:avoid;page-break-inside:avoid}
.sid-print-slot--page-break{page-break-after:always;break-after:page}
`;
