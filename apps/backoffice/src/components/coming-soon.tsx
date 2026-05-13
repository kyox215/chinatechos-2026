import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="glass-card mx-auto max-w-md p-8 text-center">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Construction className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {description ?? "此功能正在开发中，敬请期待。"}
      </p>
    </div>
  );
}
