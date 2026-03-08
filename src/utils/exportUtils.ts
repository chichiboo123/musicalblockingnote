import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportAsJPG(
  contentRef: React.RefObject<HTMLDivElement>,
  filename: string,
  title?: string
) {
  if (!contentRef.current) return;

  const canvas = await html2canvas(contentRef.current, {
    scale: 2,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc) => {
      const els = clonedDoc.querySelectorAll("[data-draggable]");
      els.forEach((el) => {
        (el as HTMLElement).style.border = "none";
        (el as HTMLElement).style.boxShadow = "none";
        (el as HTMLElement).style.outline = "none";
      });
      // Hide resize handles
      const handles = clonedDoc.querySelectorAll("[data-resize-handle]");
      handles.forEach((h) => ((h as HTMLElement).style.display = "none"));
    },
  });

  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Add MEMO watermark
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.textAlign = "right";
    ctx.fillText("MEMO", canvas.width - 20, 40);
  }

  const link = document.createElement("a");
  link.download = `${filename || "blocking-note"}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();
}

export async function exportAsPDF(
  sectionRefs: React.RefObject<HTMLDivElement>[],
  filename: string
) {
  const pdf = new jsPDF("l", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < sectionRefs.length; i++) {
    const ref = sectionRefs[i];
    if (!ref.current) continue;

    if (i > 0) pdf.addPage();

    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        const els = clonedDoc.querySelectorAll("[data-draggable]");
        els.forEach((el) => {
          (el as HTMLElement).style.border = "none";
          (el as HTMLElement).style.boxShadow = "none";
          (el as HTMLElement).style.outline = "none";
        });
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const finalHeight = Math.min(imgHeight, pageHeight - 20);

    pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, finalHeight);
  }

  pdf.save(`${filename || "blocking-note"}.pdf`);
}
