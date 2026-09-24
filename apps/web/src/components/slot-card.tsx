import { MapPin } from "lucide-react";
import { BookSlotButton } from "@/components/book-slot-button";
import { Link } from "@/i18n/navigation";
import type { SlotCardModel } from "@/lib/slot-listing-model";

export function SlotCard({
  card,
  bookable,
  identity = "link",
}: {
  card: SlotCardModel;
  bookable: boolean;
  identity?: "link" | "plain" | "hidden";
}) {
  const {
    craftsmanId,
    craftLabel,
    craftsmanName,
    whenLabel,
    zoneNote,
    placeLabel,
    rateLabel,
    perHourLabel,
    booking,
  } = card;

  return (
    <li className="min-w-0 border-b py-8">
      <article className="flex h-full flex-col gap-6">
        {identity !== "hidden" && <p className="eyebrow text-primary">{craftLabel}</p>}

        <div className="flex flex-1 flex-col gap-4">
          {identity === "link" && (
            <h2 className="section-heading wrap-anywhere">
              <Link
                href={`/craftsmen/${craftsmanId}`}
                className="underline-offset-4 hover:underline"
              >
                {craftsmanName}
              </Link>
            </h2>
          )}
          {identity === "plain" && (
            <h2 className="section-heading wrap-anywhere">{craftsmanName}</h2>
          )}

          <p className="font-medium tabular-nums">{whenLabel}</p>
          <p className="text-xs text-muted-foreground">{zoneNote}</p>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {placeLabel}
            </span>
            <span className="text-sm font-medium">
              {rateLabel}
              <span className="font-normal text-muted-foreground">{perHourLabel}</span>
            </span>
          </div>

          {bookable && (
            <BookSlotButton booking={booking} craftsmanName={craftsmanName} whenLabel={whenLabel} />
          )}
        </div>
      </article>
    </li>
  );
}
