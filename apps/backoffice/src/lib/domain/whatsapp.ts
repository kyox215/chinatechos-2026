export type TemplateVars = {
  customerName?: string;
  publicNo?: string;
  quotation?: string;
  deviceLabel?: string;
  storePhone?: string;
  storeName?: string;
};

/**
 * Replace template placeholders with actual values.
 * Placeholders use {varName} syntax.
 */
export function renderTemplate(body: string, vars: TemplateVars): string {
  let result = body;
  result = result.replace(/\{customerName\}/g, vars.customerName ?? "Cliente");
  result = result.replace(/\{publicNo\}/g, vars.publicNo ?? "");
  result = result.replace(/\{quotation\}/g, vars.quotation ?? "");
  result = result.replace(/\{deviceLabel\}/g, vars.deviceLabel ?? "");
  result = result.replace(/\{storePhone\}/g, vars.storePhone ?? "");
  result = result.replace(/\{storeName\}/g, vars.storeName ?? "");
  return result;
}

/**
 * Build a wa.me deep link for WhatsApp.
 * Phone should be in E.164 format (e.g. +393331234567).
 */
export function buildWhatsAppLink(phone: string, messageBody: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(messageBody);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}
