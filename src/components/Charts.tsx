/** Kichik diagrammalar: kartalardagi haftalik ustunlar va chiziq. Qiymatlar haqiqiy o‘qish sonidan olinadi. */
export function Bars({ values, className = "" }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const w = 100 / values.length;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      {values.map((v, i) => {
        const h = v > 0 ? 6 + (v / max) * 32 : 3;
        return <rect key={i} x={i * w + w * 0.22} y={40 - h} width={w * 0.56} height={h} rx={w * 0.28} fill="currentColor" opacity={v > 0 ? 1 : 0.28} />;
      })}
    </svg>
  );
}

export function Spark({ values, className = "" }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * 96 + 2, 34 - (v / max) * 28] as const);
  const d = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `C${pts[i - 1]![0] + 8},${pts[i - 1]![1]} ${x - 8},${y} ${x},${y}`)).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" />
    </svg>
  );
}

/** Katta kartadagi bezak to‘lqin. */
export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 38 C25 18 45 18 70 34 S120 52 150 30 S190 14 200 22 V60 H0Z" fill="rgba(255,255,255,.16)" />
      <path d="M0 46 C30 30 55 32 80 44 S130 56 160 40 S190 30 200 34 V60 H0Z" fill="rgba(255,255,255,.12)" />
    </svg>
  );
}
