import { cn } from "@/lib/utils";

/**
 * Atrina brand mark — a stylized "A" built from two converging arcs
 * inside a rounded square, evoking the silhouette of a sea star (atrina).
 */
export function AtrinaLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="atrinaBrandGrad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="oklch(0.72 0.22 295)" />
          <stop offset="100%" stopColor="oklch(0.55 0.24 320)" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#atrinaBrandGrad)"
        opacity="0.14"
      />
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        stroke="url(#atrinaBrandGrad)"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* Stylized A — two diagonal strokes + crossbar */}
      <path
        d="M14 36 L23 12 L25 12 L34 36"
        stroke="url(#atrinaBrandGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M18 26 L30 26"
        stroke="url(#atrinaBrandGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tiny accent dot — like a starfish's center */}
      <circle cx="24" cy="22" r="1.6" fill="url(#atrinaBrandGrad)" opacity="0.9" />
    </svg>
  );
}

export function AtrinaWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AtrinaLogo size={32} />
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-tight">
          Atrina <span className="brand-text-gradient">BaaS</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
          Backend as a Service
        </span>
      </div>
    </div>
  );
}
