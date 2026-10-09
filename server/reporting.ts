import type Database from 'better-sqlite3'

// All the dashboard's aggregation logic lives in this one module. Routes in
// index.ts just call these functions and send the result — no query building
// or number-crunching there.

export interface SessionWithBookings {
  id: number
  activity: string
  date: string
  start_time: string
  duration_minutes: number
  capacity: number
  bookingCount: number
  bookedPlaces: number
}

// Sessions for a single day, with booking totals attached via a single
// grouped query rather than N+1 lookups.
function sessionsWithBookings(db: Database.Database, date: string): SessionWithBookings[] {
  return db
    .prepare(
      `SELECT
         s.id,
         s.activity,
         s.date,
         s.start_time,
         s.duration_minutes,
         s.capacity,
         COUNT(b.id) AS bookingCount,
         COALESCE(SUM(b.party_size), 0) AS bookedPlaces
       FROM sessions s
       LEFT JOIN bookings b ON b.session_id = s.id
       WHERE s.date = ?
       GROUP BY s.id
       ORDER BY s.start_time, s.activity`,
    )
    .all(date) as SessionWithBookings[]
}

// Whole-number percentage, guarding against division by zero.
function pct(part: number, whole: number): number {
  if (whole === 0) return 0
  return Math.round((part / whole) * 100)
}

export interface HeadlineStats {
  sessionCount: number
  bookingCount: number
  totalCapacity: number
  bookedPlaces: number
  occupancyPct: number
  cancelledCount: number
  averagePartySize: number
}

// Top-row summary stats for the dashboard.
export function headlineStats(db: Database.Database, date: string): HeadlineStats {
  const sessions = sessionsWithBookings(db, date)

  const sessionCount = sessions.length
  const totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0)
  const bookingCount = sessions.reduce((sum, s) => sum + s.bookingCount, 0)
  const bookedPlaces = sessions.reduce((sum, s) => sum + s.bookedPlaces, 0)

  // Cancellations get their own figure in the summary row.
  const cancelledCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM bookings b
         JOIN sessions s ON s.id = b.session_id
         WHERE s.date = ? AND b.status = 'cancelled'`,
      )
      .get(date) as { count: number }
  ).count

  const partySizeRow = db
    .prepare(
      `SELECT AVG(b.party_size) AS avgPartySize
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
       WHERE s.date = ?`,
    )
    .get(date) as { avgPartySize: number | null }

  const averagePartySize = partySizeRow.avgPartySize
    ? Math.round(partySizeRow.avgPartySize * 10) / 10
    : 0

  return {
    sessionCount,
    bookingCount,
    totalCapacity,
    bookedPlaces,
    occupancyPct: pct(bookedPlaces, totalCapacity),
    cancelledCount,
    averagePartySize,
  }
}

export interface ScheduleEntry {
  id: number
  activity: string
  start_time: string
  duration_minutes: number
  capacity: number
  bookings: number
}

// Rows for the schedule table.
export function scheduleForDay(db: Database.Database, date: string): ScheduleEntry[] {
  return sessionsWithBookings(db, date).map((s) => ({
    id: s.id,
    activity: s.activity,
    start_time: s.start_time,
    duration_minutes: s.duration_minutes,
    capacity: s.capacity,
    bookings: s.bookingCount,
  }))
}

export interface ActivityTotal {
  activity: string
  sessionCount: number
  bookingCount: number
  bookedPlaces: number
}

// Per-activity totals for the day, busiest activity (by places booked) first.
export function activityTotals(db: Database.Database, date: string): ActivityTotal[] {
  return db
    .prepare(
      `SELECT
         s.activity AS activity,
         COUNT(DISTINCT s.id) AS sessionCount,
         COUNT(b.id) AS bookingCount,
         COALESCE(SUM(b.party_size), 0) AS bookedPlaces
       FROM sessions s
       LEFT JOIN bookings b ON b.session_id = s.id
       WHERE s.date = ?
       GROUP BY s.activity
       ORDER BY bookedPlaces DESC`,
    )
    .all(date) as ActivityTotal[]
}

export interface BookingListEntry {
  id: number
  guest_name: string
  party_size: number
  status: string
  created_at: string
  activity: string
  start_time: string
}

// The full bookings list for a day, across all sessions.
export function bookingsForDay(db: Database.Database, date: string): BookingListEntry[] {
  return db
    .prepare(
      `SELECT
         b.id,
         b.guest_name,
         b.party_size,
         b.status,
         b.created_at,
         s.activity,
         s.start_time
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
       WHERE s.date = ?
       ORDER BY s.start_time, b.guest_name`,
    )
    .all(date) as BookingListEntry[]
}
