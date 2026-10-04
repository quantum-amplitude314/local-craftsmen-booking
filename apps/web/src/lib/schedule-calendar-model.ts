/** A date-only grid; these dates represent calendar cells, never job instants. */
export type ScheduleCalendarModel = {
  selected: Date;
  today: Date;
  markedDays: Date[];
  /** Days marked in the primary colour; never also in `markedDays`. */
  emphasizedDays: Date[];
};

const toCalendarDay = (date: string) => {
  const day = new Date(`${date}T00:00:00.000Z`);

  return day;
};

/** Prepare serializable calendar inputs on the server, independent of the viewer's time zone. */
export const prepareScheduleCalendar = ({
  date,
  today,
  markedDates,
  emphasizedDates = [],
}: {
  date: string;
  today: string;
  markedDates: string[];
  emphasizedDates?: string[];
}) => {
  const calendar: ScheduleCalendarModel = {
    selected: toCalendarDay(date),
    today: toCalendarDay(today),
    markedDays: markedDates.map(toCalendarDay),
    emphasizedDays: emphasizedDates.map(toCalendarDay),
  };

  return calendar;
};
