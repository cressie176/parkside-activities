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
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  insertSession.run(1, 'Archery', '2026-03-14', '09:00', 60, 12)
  insertSession.run(2, 'Aqua Fit', '2026-03-14', '09:30', 45, 20)
  insertSession.run(3, 'Pottery', '2026-03-14', '14:00', 90, 10)
  insertSession.run(4, 'Archery', '2026-03-15', '09:00', 60, 12)

  const insertBooking = db.prepare(
    `INSERT INTO bookings (session_id, guest_name, party_size, status, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
  insertBooking.run(1, 'Alice Brennan', 4, 'confirmed', '2026-03-01T10:00:00Z')
  insertBooking.run(1, 'Ben Carlisle', 3, 'confirmed', '2026-03-02T11:00:00Z')
  insertBooking.run(1, 'Cara Dunn', 2, 'cancelled', '2026-03-03T12:00:00Z')
  insertBooking.run(1, 'Dai Ellis', 5, 'confirmed', '2026-03-04T13:00:00Z')
  insertBooking.run(2, 'Eve Fraser', 5, 'confirmed', '2026-03-05T09:00:00Z')
  insertBooking.run(2, 'Finn Gale', 1, 'cancelled', '2026-03-06T09:30:00Z')
  insertBooking.run(3, 'Gwen Harris', 2, 'confirmed', '2026-03-07T14:00:00Z')
  insertBooking.run(4, 'Huw Idris', 6, 'confirmed', '2026-03-08T08:00:00Z')
})

describe('headlineStats', () => {
  it('totals the sessions running and their combined capacity', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.sessionCount).toBe(3)
    expect(stats.totalCapacity).toBe(42)
  })

  it('totals the bookings and places booked across the day', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.bookingCount).toBe(7)
    expect(stats.bookedPlaces).toBe(22)
  })

  it('calculates occupancy as a whole-number percentage of capacity', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.occupancyPct).toBe(52)
  })

  it('counts cancellations and averages party size across all bookings', () => {
    const stats = headlineStats(db, '2026-03-14')
    expect(stats.cancelledCount).toBe(2)
    expect(stats.averagePartySize).toBe(3.1)
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
  it('lists the day\'s sessions in start-time order with their booking counts', () => {
    const schedule = scheduleForDay(db, '2026-03-14')
    expect(schedule).toEqual([
      expect.objectContaining({ activity: 'Archery', start_time: '09:00', capacity: 12, bookings: 4 }),
      expect.objectContaining({ activity: 'Aqua Fit', start_time: '09:30', capacity: 20, bookings: 2 }),
      expect.objectContaining({ activity: 'Pottery', start_time: '14:00', capacity: 10, bookings: 1 }),
    ])
  })

  it('does not include sessions from other days', () => {
    const schedule = scheduleForDay(db, '2026-03-14')
    expect(schedule.find((entry) => entry.activity === 'Archery' && entry.start_time === '09:00' && entry.capacity === 12)).toBeTruthy()
    expect(schedule).toHaveLength(3)
    expect(scheduleForDay(db, '2026-03-15')).not.toEqual(schedule)
  })
})

describe('activityTotals', () => {
  it('totals sessions, bookings and places booked per activity, busiest first', () => {
    const totals = activityTotals(db, '2026-03-14')
    expect(totals).toEqual([
      { activity: 'Archery', sessionCount: 1, bookingCount: 4, bookedPlaces: 14 },
      { activity: 'Aqua Fit', sessionCount: 1, bookingCount: 2, bookedPlaces: 6 },
      { activity: 'Pottery', sessionCount: 1, bookingCount: 1, bookedPlaces: 2 },
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

  it('carries the session\'s activity and start time through on each row', () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    const alice = bookings.find((b) => b.guest_name === 'Alice Brennan')
    expect(alice).toMatchObject({ activity: 'Archery', start_time: '09:00' })
  })

  it('includes cancelled bookings alongside confirmed ones', () => {
    const bookings = bookingsForDay(db, '2026-03-14')
    const cara = bookings.find((b) => b.guest_name === 'Cara Dunn')
    expect(cara?.status).toBe('cancelled')
  })
})
