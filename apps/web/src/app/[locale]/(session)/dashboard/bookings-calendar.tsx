import { BookingCalendar } from "@/components/booking-calendar";
import { getCurrentUser } from "@/lib/auth";
import { type DashboardSearchParams, readScheduleParams } from "@/lib/dashboard-schedules";
import { getMonthBookings } from "@/lib/month-bookings";

export async function BookingsCalendar({ searchParams }: { searchParams: DashboardSearchParams }) {
  const [user, { jobDay }] = await Promise.all([
    getCurrentUser(),
    readScheduleParams(searchParams),
  ]);
  if (!user) return null;
  const bookings = await getMonthBookings({ day: jobDay });

  return <BookingCalendar {...bookings} />;
}
