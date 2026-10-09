import express from 'express'
import { db } from './db.js'
import { activityTotals, bookingsForDay, headlineStats, scheduleForDay } from './reporting.js'

const PORT = 3001

// Today in local time as 'YYYY-MM-DD'. Not toISOString(), which is UTC and
// rolls over to tomorrow while the team are still on shift.
function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromQuery(req: express.Request): string {
  return typeof req.query.date === 'string' ? req.query.date : today()
}

const app = express()

app.get('/api/stats', (req, res) => res.json(headlineStats(db, dateFromQuery(req))))
app.get('/api/schedule', (req, res) => res.json(scheduleForDay(db, dateFromQuery(req))))
app.get('/api/activities', (req, res) => res.json(activityTotals(db, dateFromQuery(req))))
app.get('/api/bookings', (req, res) => res.json(bookingsForDay(db, dateFromQuery(req))))

app.listen(PORT, () => {
  console.log(`Parkside Activities API listening on http://localhost:${PORT}`)
})
