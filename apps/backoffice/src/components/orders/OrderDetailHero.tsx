"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import { formatOrderEUR } from "@/lib/domain/order-money";

type Props = {
  backLink: ReactNode;
  publicNo: string;
  quotationAmount: number | null;
  subtitle: string;
  badgeRow: ReactNode;
  /** 横向滚动的操作区；可为 null */
  actions?: ReactNode;
};

export function OrderDetailHero({ backLink, publicNo, quotationAmount, subtitle, badgeRow, actions }: Props) {
  const { scrollY } = useScroll();
  const heroPad = useTransform(scrollY, [0, 120], [24, 10]);
  const titleScale = useTransform(scrollY, [0, 120], [1, 0.86]);
  const subtitleOpacity = useTransform(scrollY, [0, 80], [1, 0]);

  const quotationFormatted = formatOrderEUR(quotationAmount);

  return (
    <motion.section
      className="glass-card sticky top-16 z-20 mb-6 px-4 py-1 md:px-5"
      style={{ paddingBottom: heroPad, paddingTop: heroPad }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{backLink}</div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <motion.div className="min-w-0" style={{ originX: 0, scale: titleScale }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight gradient-text md:text-3xl">
              {publicNo}
            </span>
            {badgeRow}
          </div>
          <motion.p className="mt-1 truncate text-sm text-muted-foreground" style={{ opacity: subtitleOpacity }}>
            {subtitle}
          </motion.p>
        </motion.div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">总报价</div>
          <div className="font-display text-xl font-semibold tabular-nums text-foreground">{quotationFormatted}</div>
        </div>
      </div>

      {actions ? (
        <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-5 md:px-5 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-min items-center gap-2 whitespace-nowrap">{actions}</div>
        </div>
      ) : null}
    </motion.section>
  );
}
