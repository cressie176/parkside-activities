import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

// Resolve the db file relative to the repo root, not the process cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'parkside.db')

export const db = new Database(dbPath)

export interface SessionRow {
  id: number
  activity: string
  date: string
  start_time: string
  duration_minutes: number
  capacity: number
}

export interface BookingRow {
  id: number
  session_id: number
  guest_name: string
  party_size: number
  status: string
  created_at: string
}
