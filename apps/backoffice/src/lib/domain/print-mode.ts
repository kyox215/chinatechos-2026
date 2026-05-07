"use client";

const PRINTING_CLASS = "printing-order-sheet";
const PRINT_HOST_CLASS = "printing-order-host";

function collectPrintHosts(): HTMLElement[] {
  const marked: HTMLElement[] = [];
  const sheets = document.querySelectorAll<HTMLElement>(".order-print-sheet");
  sheets.forEach((sheet) => {
    let cursor = sheet.parentElement;
    while (cursor && cursor !== document.body) {
      if (!cursor.classList.contains(PRINT_HOST_CLASS)) {
        cursor.classList.add(PRINT_HOST_CLASS);
        marked.push(cursor);
      }
      cursor = cursor.parentElement;
    }
  });
  return marked;
}

export function triggerOrderSheetPrint(onAfter?: () => void) {
  if (typeof window === "undefined") return;

  const body = document.body;
  const markedHosts = collectPrintHosts();
  let finalized = false;

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    body.classList.remove(PRINTING_CLASS);
    markedHosts.forEach((el) => el.classList.remove(PRINT_HOST_CLASS));
    onAfter?.();
  };

  const onAfterPrint = () => finalize();
  body.classList.add(PRINTING_CLASS);
  window.addEventListener("afterprint", onAfterPrint, { once: true });

  try {
    window.print();
  } finally {
    window.setTimeout(() => {
      window.removeEventListener("afterprint", onAfterPrint);
      finalize();
    }, 0);
  }
}
