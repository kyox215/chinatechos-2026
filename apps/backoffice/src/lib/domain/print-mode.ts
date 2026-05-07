"use client";

const PRINTING_CLASS = "printing-order-sheet";
const PORTAL_ID = "print-portal";

function getPrintPortal(): HTMLElement {
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement("div");
    portal.id = PORTAL_ID;
    document.body.appendChild(portal);
  }
  return portal;
}

export function triggerOrderSheetPrint(onAfter?: () => void) {
  if (typeof window === "undefined") return;

  const sheet = document.querySelector<HTMLElement>(".order-print-sheet");
  if (!sheet) return;

  const originalParent = sheet.parentElement;
  const originalNextSibling = sheet.nextSibling;

  const portal = getPrintPortal();
  portal.appendChild(sheet);

  const body = document.body;
  body.classList.add(PRINTING_CLASS);

  let finalized = false;
  const finalize = () => {
    if (finalized) return;
    finalized = true;

    body.classList.remove(PRINTING_CLASS);

    if (originalParent) {
      originalParent.insertBefore(sheet, originalNextSibling);
    }

    onAfter?.();
  };

  window.addEventListener("afterprint", () => finalize(), { once: true });

  try {
    window.print();
  } finally {
    window.setTimeout(() => finalize(), 0);
  }
}
