import { sanitizeFilename } from "@/lib/utils";

// html2canvas + jsPDF are ~700KB of the bundle and are only needed the moment
// someone exports, so they are loaded on demand instead of on first paint.
const loadHtml2Canvas = () => import("html2canvas").then((m) => m.default);
const loadJsPDF = () => import("jspdf").then((m) => m.default);

/** Strip editing chrome and reveal export-only chrome inside the cloned DOM. */
function prepareClone(clonedDoc: Document) {
  clonedDoc.querySelectorAll("[data-draggable]").forEach((el) => {
    const node = el as HTMLElement;
    node.style.border = "none";
    node.style.boxShadow = "none";
    node.style.outline = "none";
  });
  clonedDoc.querySelectorAll("[data-export-hidden]").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
  clonedDoc.querySelectorAll("[data-resize-handle]").forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });
  // Title/cast headers that only make sense on paper
  clonedDoc.querySelectorAll("[data-export-only]").forEach((el) => {
    (el as HTMLElement).style.display = "block";
  });
  // Textareas clip their own overflow on screen; grow them so no lyric is cut off
  clonedDoc.querySelectorAll("textarea").forEach((el) => {
    const ta = el as HTMLTextAreaElement;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight + 4}px`;
    ta.style.overflow = "visible";
    ta.style.resize = "none";
  });
}

async function capture(node: HTMLElement) {
  const html2canvas = await loadHtml2Canvas();
  return html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
    useCORS: true,
    onclone: prepareClone,
  });
}

export async function exportAsJPG(contentRef: React.RefObject<HTMLDivElement>, filename: string) {
  if (!contentRef.current) return;
  const canvas = await capture(contentRef.current);
  const link = document.createElement("a");
  link.download = `${sanitizeFilename(filename) || "blocking-note"}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
}

export async function exportAsPDF(sectionRefs: React.RefObject<HTMLDivElement>[], filename: string) {
  const JsPDF = await loadJsPDF();
  const pdf = new JsPDF("l", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const footerSpace = 8;

  const usable = {
    width: pageWidth - margin * 2,
    height: pageHeight - margin * 2 - footerSpace,
  };

  let pageCount = 0;
  for (const ref of sectionRefs) {
    if (!ref?.current) continue;
    if (pageCount > 0) pdf.addPage();
    pageCount++;

    const canvas = await capture(ref.current);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Fit inside the page on BOTH axes — the previous version clamped only the
    // height, which squashed tall sections out of proportion.
    const scale = Math.min(usable.width / canvas.width, usable.height / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(imgData, "JPEG", margin + (usable.width - w) / 2, margin, w, h);
  }

  if (pageCount === 0) return;

  // Page numbers (ASCII only — the built-in PDF fonts carry no Hangul glyphs).
  const total = pdf.getNumberOfPages();
  pdf.setFontSize(9);
  pdf.setTextColor(140);
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.text(`${i} / ${total}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  pdf.save(`${sanitizeFilename(filename) || "blocking-note"}.pdf`);
}
