import Database from 'better-sqlite3'
import { dbPath } from '../server/dbPath.js'

// Fixed seed so the sample data is the same every time it's rebuilt.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260902)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

interface ActivityDefinition {
  name: string
  capacity: number
  duration: number
  times: readonly string[]
  /** Typical share of capacity taken up, as [min, max]. */
  fill: readonly [number, number]
}

const ACTIVITIES: readonly ActivityDefinition[] = [
  {
    name: 'Archery',
    capacity: 12,
    duration: 60,
    times: ['09:00', '11:00', '15:00'],
    fill: [0.2, 1],
  },
  { name: 'Aqua Fit', capacity: 20, duration: 45, times: ['09:30', '17:30'], fill: [0.2, 0.95] },
  { name: "Kids' Club", capacity: 25, duration: 120, times: ['09:00', '10:30'], fill: [0.3, 1] },
  { name: 'Evening Show', capacity: 120, duration: 90, times: ['20:00'], fill: [0.15, 0.5] },
  { name: 'Pottery', capacity: 10, duration: 90, times: ['14:00'], fill: [0.15, 0.9] },
  {
    name: 'Tennis Coaching',
    capacity: 8,
    duration: 60,
    times: ['08:30', '16:00'],
    fill: [0.15, 1],
  },
  {
    name: 'Bike Hire Tour',
    capacity: 15,
    duration: 120,
    times: ['10:00', '14:30'],
    fill: [0.2, 0.9],
  },
  { name: 'Crazy Golf', capacity: 30, duration: 60, times: ['11:30', '16:30'], fill: [0.15, 0.7] },
]

const GUEST_NAMES = [
  'Lauren Whitfield',
  'Michael Osei',
  'Rhiannon Davies',
  'Sanjay Ahmed',
  'Fiona Balfour',
  'Callum Reid',
  'Nadia Hussain',
  'Gareth Pritchard',
  'Imogen Clarke',
  'Dermot Kelly',
  'Priya Nair',
  'Stuart Menzies',
  'Bethan Lloyd',
  'Owen Trethewey',
  'Amara Okonkwo',
  'Hamish Sinclair',
  'Josie Bramwell',
  'Tomasz Nowak',
  'Ellie Fairbairn',
  'Raj Chandra',
  'Morag Buchanan',
  'Dylan Hargreaves',
  'Sofia Marchetti',
  'Neil Cathcart',
  'Kirsty Dunlop',
  'Abdul Rahman',
  'Verity Ashcombe',
  'Liam Doherty',
  'Chloe Nesbitt',
  'Peter Grantham',
  'Yasmin Farouk',
  'Duncan Erskine',
  'Harriet Vaughan',
  'Joseph Adeyemi',
  'Megan Tudor',
  'Ciaran Boyle',
  'Alice Pemberton',
  'Ravi Deshpande',
  'Sian Morgan',
  'Alan Widdowson',
]

// Party sizes skew small, with enough larger groups that counting bookings and
// counting people give noticeably different answers.
const PARTY_SIZES = [1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6]

function toIsoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateOffsetFromToday(offset: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

interface PlannedSession {
  activity: string
  date: string
  startTime: string
  duration: number
  capacity: number
  /** Places to fill with confirmed bookings. Never more than capacity. */
  confirmedPlaces: number
  /** Extra bookings added on top and marked cancelled. */
  cancelledBookings: number
}

function activity(name: string): ActivityDefinition {
  const found = ACTIVITIES.find((a) => a.name === name)
  if (!found) throw new Error(`Unknown activity: ${name}`)
  return found
}

/** The current day is laid out by hand so the dashboard always opens on a
 *  useful spread — a couple of sessions under real pressure, a couple barely
 *  touched, and the evening show comfortably busy. */
function sessionsForToday(date: string): PlannedSession[] {
  const plan: Array<[string, string, number, number]> = [
    // activity, start time, confirmed places, cancelled bookings
    ['Tennis Coaching', '08:30', 1, 0],
    ['Archery', '09:00', 12, 3],
    ["Kids' Club", '09:00', 24, 1],
    ['Aqua Fit', '09:30', 13, 2],
    ['Bike Hire Tour', '10:00', 9, 1],
    ['Pottery', '14:00', 2, 0],
    ['Evening Show', '20:00', 52, 4],
  ]
  return plan.map(([name, startTime, confirmedPlaces, cancelledBookings]) => {
    const a = activity(name)
    return {
      activity: a.name,
      date,
      startTime,
      duration: a.duration,
      capacity: a.capacity,
      confirmedPlaces,
      cancelledBookings,
    }
  })
}

function sessionsForOrdinaryDay(date: string): PlannedSession[] {
  const count = randomInt(5, 7)
  const chosen: PlannedSession[] = []
  const taken = new Set<string>()

  while (chosen.length < count) {
    const a = pick(ACTIVITIES)
    const startTime = pick(a.times)
    const key = `${a.name}@${startTime}`
    if (taken.has(key)) continue
    taken.add(key)

    const [minFill, maxFill] = a.fill
    const fraction = minFill + rand() * (maxFill - minFill)
    const confirmedPlaces = Math.max(1, Math.min(a.capacity, Math.round(a.capacity * fraction)))

    chosen.push({
      activity: a.name,
      date,
      startTime,
      duration: a.duration,
      capacity: a.capacity,
      confirmedPlaces,
      cancelledBookings: rand() < 0.5 ? randomInt(1, 3) : 0,
    })
  }

  return chosen.sort((x, y) => x.startTime.localeCompare(y.startTime))
}

function planSessions(): PlannedSession[] {
  const planned: PlannedSession[] = []

  for (let offset = -3; offset <= 10; offset += 1) {
    const date = toIsoDate(dateOffsetFromToday(offset))

    // Nothing on at all.
    if (offset === 9) continue

    // A very thin day — one session and little else.
    if (offset === 3) {
      const a = activity('Crazy Golf')
      planned.push({
        activity: a.name,
        date,
        startTime: '11:30',
        duration: a.duration,
        capacity: a.capacity,
        confirmedPlaces: 4,
        cancelledBookings: 0,
      })
      continue
    }

    if (offset === 0) {
      planned.push(...sessionsForToday(date))
      continue
    }

    planned.push(...sessionsForOrdinaryDay(date))
  }

  return planned
}

/** Party sizes adding up to exactly the requested number of places. */
function partySizesFor(places: number): number[] {
  const sizes: number[] = []
  let remaining = places
  while (remaining > 0) {
    const next = pick(PARTY_SIZES)
    const size = next > remaining ? remaining : next
    sizes.push(size)
    remaining -= size
  }
  return sizes
}

function createdAtBefore(sessionDate: string): string {
  const created = new Date(`${sessionDate}T09:00:00`)
  created.setDate(created.getDate() - randomInt(1, 28))
  created.setHours(randomInt(7, 21), randomInt(0, 59), 0, 0)
  return created.toISOString()
}

const db = new Database(dbPath)

db.exec(`
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS sessions;

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    capacity INTEGER NOT NULL
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    guest_name TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

const insertSession = db.prepare(
  `INSERT INTO sessions (activity, date, start_time, duration_minutes, capacity)
   VALUES (?, ?, ?, ?, ?)`,
)
const insertBooking = db.prepare(
  `INSERT INTO bookings (session_id, guest_name, party_size, status, created_at)
   VALUES (?, ?, ?, ?, ?)`,
)

const planned = planSessions()
let bookingTotal = 0

const seed = db.transaction(() => {
  for (const session of planned) {
    const result = insertSession.run(
      session.activity,
      session.date,
      session.startTime,
      session.duration,
      session.capacity,
    )
    const sessionId = Number(result.lastInsertRowid)

    for (const size of partySizesFor(session.confirmedPlaces)) {
      insertBooking.run(
        sessionId,
        pick(GUEST_NAMES),
        size,
        'confirmed',
        createdAtBefore(session.date),
      )
      bookingTotal += 1
    }

    for (let i = 0; i < session.cancelledBookings; i += 1) {
      insertBooking.run(
        sessionId,
        pick(GUEST_NAMES),
        pick(PARTY_SIZES),
        'cancelled',
        createdAtBefore(session.date),
      )
      bookingTotal += 1
    }
  }
})

seed()

const dates = planned.map((s) => s.date).sort()
console.log(
  `Seeded ${planned.length} sessions and ${bookingTotal} bookings ` +
    `covering ${dates[0]} to ${dates[dates.length - 1]}.`,
)

db.close()
