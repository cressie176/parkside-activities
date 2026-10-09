import Database from 'better-sqlite3'
import { dbPath } from './dbPath.js'

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
