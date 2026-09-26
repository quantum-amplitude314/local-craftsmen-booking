import { useTranslations } from "next-intl";

// The header icon's squares, clockwise from the top left; each takes the accent in turn.
const squares = [
  { x: 13.75, y: 13.75 },
  { x: 36.75, y: 13.75 },
  { x: 36.75, y: 36.75 },
  { x: 13.75, y: 36.75 },
];

export default function Loading() {
  const t = useTranslations("shell");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="dashboard-shell grid min-h-[60svh] place-items-center"
    >
      <p
        role="status"
        className="brand-loader flex flex-col items-center gap-4 text-xs text-muted-foreground"
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className="size-12">
          <rect width="64" height="64" rx="14" className="fill-(--brand-mark-tile)" />
          {squares.map(({ x, y }, index) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="13.5"
              height="13.5"
              rx="2"
              strokeWidth="3.5"
              className="brand-loader-square"
              style={{ animationDelay: `${index * 0.4}s` }}
            />
          ))}
        </svg>
        {t("loading")}
      </p>
    </main>
  );
}
