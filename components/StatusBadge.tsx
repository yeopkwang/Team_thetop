import type { StatusTone } from "@/lib/status";

const TONES: Record<StatusTone, string> = {
  wait: "bg-wait-50 text-wait-700",
  ok: "bg-ok-50 text-ok-600",
  brand: "bg-brand-50 text-brand-700",
  muted: "bg-surface text-ink-2",
};

export default function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-cap font-semibold ${TONES[tone]}`}>{label}</span>
  );
}
