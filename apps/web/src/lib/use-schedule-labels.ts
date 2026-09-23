"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

export type ScheduleLabels = { date: string; zone: string; times: Record<string, string> };

/**
 * Formats a day, its times and the zone abbreviation in the browser after mount. Server HTML and
 * hydration render without labels, so no engine-specific Intl output can differ between them.
 */
export const useScheduleLabels = ({
  timeZone,
  date,
  times,
}: {
  timeZone: string;
  date: string;
  times: string[];
}) => {
  const locale = useLocale();
  const timesKey = times.join(" ");
  const [labels, setLabels] = useState<ScheduleLabels | null>(null);

  useEffect(() => {
    // Plain "en" names the zone "GMT+2"; en-GB gives the familiar CET and CEST.
    const intlLocale = locale === "en" ? "en-GB" : locale;
    const formatTime = new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    const formatDate = new Intl.DateTimeFormat(intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
    const formatZone = new Intl.DateTimeFormat(intlLocale, { timeZone, timeZoneName: "short" });
    const isoTimes = timesKey.split(" ").filter(Boolean);
    const dayStart = Date.parse(isoTimes[0] ?? date);
    const formatted: ScheduleLabels = {
      date: formatDate.format(Date.parse(date)),
      zone:
        formatZone.formatToParts(dayStart).find(({ type }) => type === "timeZoneName")?.value ?? "",
      times: Object.fromEntries(
        isoTimes.map((time) => [time, formatTime.format(Date.parse(time))]),
      ),
    };
    setLabels(formatted);
  }, [locale, timeZone, date, timesKey]);

  return labels;
};
