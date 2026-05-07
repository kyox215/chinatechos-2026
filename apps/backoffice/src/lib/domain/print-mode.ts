"use client";

const PRINTING_CLASS = "printing-order-sheet";
const PORTAL_ID = "print-portal";
const PRINT_STYLE_ID = "print-page-style";

export type PrintPaper = "A5" | "A4";
export type PrintOrientation = "landscape" | "portrait";
export type PrintDensity = "compact" | "normal" | "relaxed";

export type PrintOptions = {
  paperSize?: PrintPaper;
  orientation?: PrintOrientation;
  density?: PrintDensity;
  marginMm?: 3 | 5 | 8;
  /** CSS selector for the printable root (defaults to the first `.order-print-sheet`). */
  sheetSelector?: string;
};

type CorePrintOptions = Required<Omit<PrintOptions, "sheetSelector">>;

const DEFAULT_PRINT_OPTIONS: CorePrintOptions = {
  paperSize: "A5",
  orientation: "landscape",
  density: "normal",
  marginMm: 5,
};

function getPrintPortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    document.body.appendChild(portal);
  }
  return portal;
}

function normalizeOptions(options?: PrintOptions): CorePrintOptions {
  return {
    paperSize: options?.paperSize ?? DEFAULT_PRINT_OPTIONS.paperSize,
    orientation: options?.orientation ?? DEFAULT_PRINT_OPTIONS.orientation,
    density: options?.density ?? DEFAULT_PRINT_OPTIONS.density,
    marginMm: options?.marginMm ?? DEFAULT_PRINT_OPTIONS.marginMm,
  };
}

function getPaperSizeMm(paperSize: PrintPaper, orientation: PrintOrientation) {
  const base = paperSize === "A4" ? { w: 210, h: 297 } : { w: 148, h: 210 };
  return orientation === "landscape" ? { w: base.h, h: base.w } : base;
}

function applyPrintConfig(
  body: HTMLElement,
  options: CorePrintOptions,
) {
  const { w, h } = getPaperSizeMm(options.paperSize, options.orientation);
  const contentW = Math.max(0, w - options.marginMm * 2);
  const contentH = Math.max(0, h - options.marginMm * 2);

  body.dataset.printPaper = options.paperSize;
  body.dataset.printOrientation = options.orientation;
  body.dataset.printDensity = options.density;
  body.dataset.printMargin = String(options.marginMm);
  body.style.setProperty("--print-content-width", `${contentW}mm`);
  body.style.setProperty("--print-content-height", `${contentH}mm`);

  let style = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: ${options.paperSize} ${options.orientation}; margin: ${options.marginMm}mm; } }`;
}

function clearPrintConfig(body: HTMLElement) {
  delete body.dataset.printPaper;
  delete body.dataset.printOrientation;
  delete body.dataset.printDensity;
  delete body.dataset.printMargin;
  body.style.removeProperty("--print-content-width");
  body.style.removeProperty("--print-content-height");

  const style = document.getElementById(PRINT_STYLE_ID);
  style?.remove();
}

export function triggerOrderSheetPrint(
  optionsOrAfter?: PrintOptions | (() => void),
  onAfterMaybe?: () => void,
) {
  if (typeof window === "undefined") return;

  const optsArg = typeof optionsOrAfter === "function" ? undefined : optionsOrAfter;
  const options = normalizeOptions(optsArg);
  const onAfter =
    typeof optionsOrAfter === "function" ? optionsOrAfter : onAfterMaybe;

  const sheetSelector = optsArg?.sheetSelector ?? ".order-print-sheet";
  const sheet = document.querySelector<HTMLElement>(sheetSelector);
  if (!sheet) return;

  const originalParent = sheet.parentElement;
  const originalNextSibling = sheet.nextSibling;

  const portal = getPrintPortal();
  portal.appendChild(sheet);

  const body = document.body;
  body.classList.add(PRINTING_CLASS);
  applyPrintConfig(body, options);

  let finalized = false;
  const finalize = () => {
    if (finalized) return;
    finalized = true;

    body.classList.remove(PRINTING_CLASS);
    clearPrintConfig(body);

    if (originalParent) {
      originalParent.insertBefore(sheet, originalNextSibling);
    }

    onAfter?.();
  };

  requestAnimationFrame(() => {
    setTimeout(() => {
      window.addEventListener("afterprint", () => finalize(), { once: true });

      try {
        window.print();
      } finally {
        setTimeout(() => finalize(), 0);
      }
    }, 0);
  });
}
