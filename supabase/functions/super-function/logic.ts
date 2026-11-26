export const MAX_SLIDES = 10;
export const MAX_UNITS = 80;
export const MAX_CHARS = 4000;
export const LAYOUTS = ["quote", "big", "plain", "title_body"] as const;
export type Layout = (typeof LAYOUTS)[number];
export type Plan = { from: number; to: number; bg: number; layout: Layout };
export type OutSlide = { bg: number; layout: Layout; parts: string[] };

export function splitUnits(text: string): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r/g, "").split(/\n\s*\n|\n/)) {
    const p = para.trim();
    if (!p) continue;
    for (const s of p.split(/(?<=[.!?…])["»”’)]*\s+/)) if (s.trim()) out.push(s.trim());
  }
  return out;
}

export function validPlan(raw: unknown, n: number): Plan[] | null {
  const arr = (raw as { slides?: unknown })?.slides;
  if (!Array.isArray(arr) || !arr.length || arr.length > MAX_SLIDES) return null;
  const plan: Plan[] = [];
  let next = 0;
  for (const s of arr) {
    const { from, to, bg, layout } = (s ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(from) || !Number.isInteger(to) || !Number.isInteger(bg)) return null;
    if (from !== next || (to as number) < (from as number) || (to as number) >= n) return null;
    if ((bg as number) < 0 || (bg as number) > 6 || !LAYOUTS.includes(layout as Layout)) return null;
    plan.push({ from: from as number, to: to as number, bg: bg as number, layout: layout as Layout });
    next = (to as number) + 1;
  }
  return next === n ? plan : null;
}

export function fallbackPlan(units: string[]): Plan[] {
  const plan: Plan[] = [];
  let from = 0, len = 0;
  const dark = [0, 1, 2, 6];
  units.forEach((u, i) => {
    if (i > from && len + u.length > 200) {
      plan.push({ from, to: i - 1, bg: dark[plan.length % dark.length]!, layout: "plain" });
      from = i; len = 0;
    }
    len += u.length + 1;
  });
  plan.push({ from, to: units.length - 1, bg: dark[plan.length % dark.length]!, layout: "plain" });
  while (plan.length > MAX_SLIDES) {
    const b = plan.pop()!; plan[plan.length - 1]!.to = b.to;
  }
  return plan;
}

export function build(units: string[], plan: Plan[]): OutSlide[] {
  return plan.map((p) => {
    const group = units.slice(p.from, p.to + 1);
    const text = group.join(" ");
    let layout = p.layout;
    if (layout === "big" && text.length > 70) layout = "plain";
    if (layout === "title_body" && group.length < 2) layout = "plain";
    const parts = layout === "title_body" ? [group[0]!, group.slice(1).join(" ")] : [text];
    return { bg: p.bg, layout, parts };
  });
}
