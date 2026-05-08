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

  /** 使用克隆节点打印：移动真实 DOM 会与 React 协调冲突，移动端预览更易出现空白或不完整内容 */
  const printSheet = sheet.cloneNode(true) as HTMLElement;
  printSheet.removeAttribute("id");

  const portal = getPrintPortal();
  portal.appendChild(printSheet);

  const body = document.body;
  body.classList.add(PRINTING_CLASS);
  applyPrintConfig(body, options);

  let finalized = false;
  /** DOM lib 下为 number；与 Node Timeout 合并时需避免混用 */
  let fallbackTimer: number | undefined;
  /**
   * 移动端在系统打印面板内切换纸张/份数时，`matchMedia("print")` 常会短暂变为 `false`，
   * 若立即 finalize 会拆掉 portal，预览会变成整页 App。仅在离开打印态稳定后再清理。
   */
  let printExitDebounce: number | undefined;
  const PRINT_EXIT_DEBOUNCE_MS = 1600;
  const mql = window.matchMedia("print");

  const cleanupListeners = () => {
    window.removeEventListener("afterprint", onAfterPrint);
    mql.removeEventListener("change", onPrintMediaChange);
    if (fallbackTimer !== undefined) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    if (printExitDebounce !== undefined) {
      window.clearTimeout(printExitDebounce);
      printExitDebounce = undefined;
    }
  };

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    cleanupListeners();

    body.classList.remove(PRINTING_CLASS);
    clearPrintConfig(body);

    printSheet.remove();

    onAfter?.();
  };

  function onAfterPrint() {
    finalize();
  }

  function onPrintMediaChange() {
    if (mql.matches) {
      if (printExitDebounce !== undefined) {
        window.clearTimeout(printExitDebounce);
        printExitDebounce = undefined;
      }
      return;
    }
    if (printExitDebounce !== undefined) {
      window.clearTimeout(printExitDebounce);
    }
    printExitDebounce = window.setTimeout(() => {
      printExitDebounce = undefined;
      if (!mql.matches) finalize();
    }, PRINT_EXIT_DEBOUNCE_MS);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.addEventListener("afterprint", onAfterPrint);
        mql.addEventListener("change", onPrintMediaChange);
        fallbackTimer = window.setTimeout(() => finalize(), 60_000) as unknown as number;

        window.print();
      }, 0);
    });
  });
}
