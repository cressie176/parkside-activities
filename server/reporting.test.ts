import Database from 'better-sqlite3'
import { beforeAll, describe, expect, it } from 'vitest'
import { activityTotals, bookingsForDay, headlineStats, scheduleForDay } from './reporting'

let db: Database.Database

beforeAll(() => {
  db = new Database(':memory:')

  db.exec(`
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity TEXT NOT NULL, date TEXT NOT NULL, start_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL, capacity INTEGER NOT NULL);
    CREATE TABLE bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      guest_name TEXT NOT NULL, party_size INTEGER NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL);
  `)

  const insertSession = db.prepare(
    `INSERT INTO sessions (id, activity, date, start_time, duration_minutes, capacity)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  insertSession.run(1, 'Archery', '2026-03-14', '09:00', 60, 12)
  insertSession.run(2, 'Aqua Fit', '2026-03-14', '09:30', 45, 20)
  insertSession.run(3, 'Pottery', '2026-03-14', '14:00', 90, 10)
  insertSession.run(4, 'Archery', '2026-03-15', '09:00', 60, 12)
  // 2026-03-16: Kayaking has only a cancelled booking, which would otherwise
  // make it the busiest activity of the day.
  insertSession.run(5, 'Kayaking', '2026-03-16', '10:00', 120, 8)
  insertSession.run(6, 'Climbing', '2026-03-16', '11:00', 60, 10)
  // 2026-03-17: confirmed bookings exactly fill the session; a cancellation
  // would push it over capacity.
  insertSession.run(7, 'Yoga', '2026-03-17', '08:00', 60, 6)
  // 2026-03-18: the only booking is cancelled.
  insertSession.run(8, 'Yoga', '2026-03-18', '08:00', 60, 15)

  const insertBooking = db.prepare(
    `INSERT INTO bookings (session_id, guest_name, party_size, status, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
  insertBooking.run(1, 'Alice Brennan', 4, 'confirmed', '2026-03-01T10:00:00Z')
  insertBooking.run(1, 'Ben Carlisle', 3, 'confirmed', '2026-03-02T11:00:00Z')
  insertBooking.run(1, 'Cara Dunn', 2, 'cancelled', '2026-03-03T12:00:00Z')
  insertBooking.run(1, 'Dai Ellis', 5, 'confirmed', '2026-03-04T13:00:00Z')
  insertBooking.run(2, 'Eve Fraser', 5, 'confirmed', '2026-03-05T09:00:00Z')
  insertBooking.run(2, 'Finn Gale', 1, 'cancelled', '2026-03-06T09:30:00Z')
  insertBooking.run(3, 'Gwen Harris', 2, 'confirmed', '2026-03-07T14:00:00Z')
  insertBooking.run(4, 'Huw Idris', 6, 'confirmed', '2026-03-08T08:00:00Z')
  insertBooking.run(5, 'Iona Jones', 6, 'cancelled', '2026-03-09T10:00:00Z')
  insertBooking.run(6, 'Jack Kemp', 3, 'confirmed', '2026-03-09T11:00:00Z')
  insertBooking.run(7, 'Kit Lowe', 4, 'confirmed', '2026-03-10T08:00:00Z')
  insertBooking.run(7, 'Lena Moss', 2, 'confirmed', '2026-03-10T09:00:00Z')
  insertBooking.run(7, 'Mo Nash', 2, 'cancelled', '2026-03-10T10:00:00Z')
  insertBooking.run(8, 'Nia Owen', 2, 'cancelled', '2026-03-11T08:00:00Z')
})

describe('headlineStats', () => {
  it('totals the sessions running and their combined capacity', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.sessionCount).toBe(3)
    expect(stats.totalCapacity).toBe(42)
  })

  it('totals the confirmed bookings and places booked across the day', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.bookingCount).toBe(5)
    expect(stats.bookedPlaces).toBe(19)
  })

  it('calculates occupancy from confirmed places as a whole-number percentage of capacity', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.occupancyPct).toBe(45)
  })

  it('counts cancelled bookings in the cancelled figure', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.cancelledCount).toBe(2)
  })

  it('averages party size across confirmed bookings only', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.averagePartySize).toBe(3.8)
  })

  it('reports a session filled by confirmed bookings as 100% occupied, whatever was cancelled', () => {
    const stats = headlineStats(db, '2026-03-17')
    expect(stats.bookedPlaces).toBe(6)
    expect(stats.totalCapacity).toBe(6)
    expect(stats.occupancyPct).toBe(100)
  })

  it('still counts sessions whose bookings are all cancelled, with nothing booked', () => {
    const stats = headlineStats(db, '2026-03-18')
    expect(stats).toEqual({
      sessionCount: 1,
      totalCapacity: 15,
      bookingCount: 0,
      bookedPlaces: 0,
      occupancyPct: 0,
      cancelledCount: 1,
      averagePartySize: 0,
    })
  })

  it('returns zeroed figures for a day with nothing scheduled', () => {
    const stats = headlineStats(db, '2026-03-20')
    expect(stats).toEqual({
      sessionCount: 0,
      totalCapacity: 0,
      bookingCount: 0,
      bookedPlaces: 0,
      occupancyPct: 0,
      cancelledCount: 0,
      averagePartySize: 0,
    })
  })
})

describe('scheduleForDay', () => {
  it("lists the day's sessions in start-time order with their confirmed booking counts", () => {
    const schedule = scheduleForDay(db, '2026-03-14')
    expect(schedule).toEqual([
      expect.objectContaining({
        activity: 'Archery',
        start_time: '09:00',
        capacity: 12,
        bookings: 3,
      }),
      expect.objectContaining({
        activity: 'Aqua Fit',
        start_time: '09:30',
        capacity: 20,
        bookings: 1,
      }),
      expect.objectContaining({
        activity: 'Pottery',
        start_time: '14:00',
        capacity: 10,
        bookings: 1,
      }),
    ])
  })

  it('still lists a session whose bookings are all cancelled, with no bookings', () => {
    const schedule = scheduleForDay(db, '2026-03-16')
    expect(schedule).toEqual([
      expect.objectContaining({ activity: 'Kayaking', capacity: 8, bookings: 0 }),
      expect.objectContaining({ activity: 'Climbing', capacity: 10, bookings: 1 }),
    ])
  })

  it('does not include sessions from other days', () => {
    const schedule = scheduleForDay(db, '2026-03-14')
    expect(
      schedule.find(
        (entry) =>
          entry.activity === 'Archery' && entry.start_time === '09:00' && entry.capacity === 12,
      ),
    ).toBeTruthy()
    expect(schedule).toHaveLength(3)
    expect(scheduleForDay(db, '2026-03-15')).not.toEqual(schedule)
  })
})

describe('activityTotals', () => {
  it('totals sessions, confirmed bookings and places booked per activity, busiest first', () => {
    const totals = activityTotals(db, '2026-03-14')
    expect(totals).toEqual([
      { activity: 'Archery', sessionCount: 1, bookingCount: 3, bookedPlaces: 12 },
      { activity: 'Aqua Fit', sessionCount: 1, bookingCount: 1, bookedPlaces: 5 },
      { activity: 'Pottery', sessionCount: 1, bookingCount: 1, bookedPlaces: 2 },
    ])
  })

  it('does not book places beyond capacity when confirmed bookings fill a session', () => {
    // Archery's only session that day has capacity 12, filled exactly by
    // confirmed bookings. Counting the cancelled booking would make it 14.
    const archery = activityTotals(db, '2026-03-14').find((t) => t.activity === 'Archery')
    expect(archery?.bookedPlaces).toBe(12)
  })

  it('ranks activities by confirmed places and keeps those with only cancelled bookings', () => {
    const totals = activityTotals(db, '2026-03-16')
    expect(totals).toEqual([
      { activity: 'Climbing', sessionCount: 1, bookingCount: 1, bookedPlaces: 3 },
      { activity: 'Kayaking', sessionCount: 1, bookingCount: 0, bookedPlaces: 0 },
    ])
  })
})

describe('bookingsForDay', () => {
  it('lists bookings ordered by session start time then guest name', () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    expect(bookings.map((b) => b.guest_name)).toEqual([
      'Alice Brennan',
      'Ben Carlisle',
      'Cara Dunn',
      'Dai Ellis',
      'Eve Fraser',
      'Finn Gale',
      'Gwen Harris',
    ])
  })

  it('excludes bookings for sessions on other days', () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    expect(bookings.find((b) => b.guest_name === 'Huw Idris')).toBeUndefined()
  })

  it("carries the session's activity and start time through on each row", () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    const alice = bookings.find((b) => b.guest_name === 'Alice Brennan')
    expect(alice).toMatchObject({ activity: 'Archery', start_time: '09:00' })
  })

  it('includes cancelled bookings alongside confirmed ones', () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    expect(bookings).toHaveLength(7)
    const cara = bookings.find((b) => b.guest_name === 'Cara Dunn')
    expect(cara?.status).toBe('cancelled')
  })
})
