"use client";

export function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -left-[20%] -top-[30%] h-[60vh] w-[60vh] rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--color-brand-violet)" }}
      />
      <div
        className="absolute -right-[15%] top-[20%] h-[50vh] w-[50vh] rounded-full opacity-15 blur-[100px]"
        style={{ background: "var(--color-brand-cyan)" }}
      />
      <div
        className="absolute -bottom-[20%] left-[30%] h-[45vh] w-[45vh] rounded-full opacity-10 blur-[80px]"
        style={{ background: "var(--color-brand-violet)" }}
      />
    </div>
  );
}
