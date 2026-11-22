/** Fikrnoma belgisi: "f" harfi va nuqta (so‘z oxiridagi clay rangli nuqta bilan bir xil). Ranglar mavzuga qarab o‘zgaradi. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true" className="shrink-0">
      <rect width="128" height="128" rx="30" className="fill-clay" />
      <g fill="none" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" className="stroke-onclay">
        <path d="M56 98V54C56 41 64 32 80 32" />
        <path d="M40 62H74" />
      </g>
      <circle cx="84" cy="96" r="7" className="fill-onclay" />
    </svg>
  );
}
