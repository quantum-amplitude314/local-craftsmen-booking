import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PhotoHero({
  className,
  watermark,
  heading,
  children,
}: {
  className?: string;
  watermark?: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn("@container grid pt-8 pb-(--section-space)", className)}>
      <div className="relative aspect-[2/1] lg:col-start-1 lg:row-start-1">
        {/* biome-ignore lint/performance/noImgElement: the Worker has no image optimizer; the AVIF is encoded ahead of time. */}
        <img
          src="/landing-hero-1440.avif"
          srcSet="/landing-hero-1440.avif 1440w, /landing-hero-2880.avif 2880w"
          sizes="(min-width: 94rem) 88rem, calc(100vw - 6rem)"
          alt=""
          width={1440}
          height={720}
          fetchPriority="high"
          className="hero-edges size-full object-cover"
        />
        <div className="hero-fade absolute inset-0 hidden lg:dark:block" />
      </div>
      <div className="flex flex-col gap-8 pt-8 lg:relative lg:col-start-1 lg:row-start-1 lg:max-w-[40cqi] lg:self-center lg:pt-0 lg:pl-[6cqi]">
        <div className="display-heading relative lg:text-[length:min(6cqi,5rem)]">
          {watermark && (
            <span aria-hidden="true" className="hero-watermark">
              {watermark}
            </span>
          )}
          <h1 className="relative">{heading}</h1>
        </div>
        <div className="flex flex-col gap-4 lg:[--background:var(--card)]">{children}</div>
      </div>
    </section>
  );
}
