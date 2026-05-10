interface MoneyTextProps {
  amount: number | null | undefined;
  currency?: string;
  className?: string;
}

export function MoneyText({ amount, currency = "€", className = "" }: MoneyTextProps) {
  if (amount == null) {
    return <span className={`font-mono tabular-nums text-muted-foreground ${className}`}>—</span>;
  }

  const formatted = Math.abs(amount).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {amount < 0 && "−"}
      {currency}{formatted}
    </span>
  );
}
