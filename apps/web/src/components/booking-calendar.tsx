"use client";

import type { CraftsmanBooking } from "@local-craftsmen/contracts";
import { useLocale, useTranslations } from "next-intl";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import type { BookingCardModel } from "@/lib/booking-calendar-model";
import { formattingLocale } from "@/lib/intl-locale";
import { useBookingCalendar } from "@/lib/use-booking-calendar";
import { useScheduleParams } from "@/lib/use-schedule-params";

function BookingCard({
  timeLabel,
  customerName,
  placeLabel,
  statusLabel,
  statusVariant,
}: BookingCardModel) {
  return (
    <Item role="listitem" size="sm" className="border-primary/20 bg-primary/10">
      <ItemContent className="min-w-0">
        <ItemTitle className="text-base tabular-nums">{timeLabel}</ItemTitle>
        <ItemDescription>{customerName}</ItemDescription>
        <ItemDescription>{placeLabel}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </ItemActions>
    </Item>
  );
}

export function BookingCalendar({
  bookings,
  day,
  clock,
}: {
  bookings: CraftsmanBooking[];
  day: string;
  clock: { timeZone: string; today: string };
}) {
  const t = useTranslations("dashboard.bookings");
  const cityName = useTranslations("cities");
  const locale = useLocale();
  const { changing, selectJobDay } = useScheduleParams();
  const { calendar, emptyMessage, cards } = useBookingCalendar({
    bookings,
    day,
    clock,
    locale: formattingLocale(locale),
    text: { cityName, status: (status) => t(`status.${status}`), empty: t("noBookings") },
  });

  return (
    // The calendar leads on a phone and sits beside the jobs from large screens on.
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row-reverse lg:items-start">
      <div className="w-full min-w-0 overflow-hidden rounded-xl border lg:max-w-80">
        <ScheduleCalendar
          calendar={calendar}
          allowPast
          disabled={changing}
          onSelect={selectJobDay}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {emptyMessage ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ItemGroup>
            {cards.map((card) => (
              <BookingCard key={card.id} {...card} />
            ))}
          </ItemGroup>
        )}
      </div>
    </div>
  );
}
