import { useEffect, useState } from 'react'
import ActivityTotals, { type ActivityTotal } from './components/ActivityTotals'
import BookingsList, { type Booking } from './components/BookingsList'
import ScheduleTable, { type ScheduleSession } from './components/ScheduleTable'
import StatCards, { type Stats } from './components/StatCards'

function todayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Handy for checking a specific day: ?date=2026-09-06
function initialDate(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('date')
  return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : todayLocal()
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`)
  }
  return response.json()
}

export default function App() {
  const [date] = useState(initialDate)
  const [stats, setStats] = useState<Stats | null>(null)
  const [schedule, setSchedule] = useState<ScheduleSession[] | null>(null)
  const [activities, setActivities] = useState<ActivityTotal[] | null>(null)
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getJson<Stats>(`/api/stats?date=${date}`),
      getJson<ScheduleSession[]>(`/api/schedule?date=${date}`),
      getJson<ActivityTotal[]>(`/api/activities?date=${date}`),
      getJson<Booking[]>(`/api/bookings?date=${date}`),
    ])
      .then(([statsData, scheduleData, activitiesData, bookingsData]) => {
        setStats(statsData)
        setSchedule(scheduleData)
        setActivities(activitiesData)
        setBookings(bookingsData)
      })
      .catch((err: Error) => {
        setError(err.message)
      })
  }, [date])

  if (error) {
    return (
      <div className="container">
        <h1>Parkside Activities</h1>
        <p>Something went wrong loading the dashboard: {error}</p>
      </div>
    )
  }

  if (!stats || !schedule || !activities || !bookings) {
    return (
      <div className="container">
        <h1>Parkside Activities</h1>
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Parkside Activities</h1>
      <p className="subtitle">{date}</p>
      <StatCards stats={stats} />
      <ScheduleTable sessions={schedule} />
      <ActivityTotals activities={activities} />
      <BookingsList bookings={bookings} />
    </div>
  )
}
