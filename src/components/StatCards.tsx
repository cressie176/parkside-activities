export interface Stats {
  sessionCount: number
  bookingCount: number
  totalCapacity: number
  bookedPlaces: number
  occupancyPct: number
  cancelledCount: number
  averagePartySize: number
}

interface Props {
  stats: Stats
}

export default function StatCards({ stats }: Props) {
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-label">Sessions</div>
        <div className="stat-value">{stats.sessionCount}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Bookings</div>
        <div className="stat-value">{stats.bookingCount}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Capacity</div>
        <div className="stat-value">{stats.totalCapacity}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Occupancy</div>
        <div className="stat-value">{stats.occupancyPct}%</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Cancelled</div>
        <div className="stat-value">{stats.cancelledCount}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Avg Party</div>
        <div className="stat-value">{stats.averagePartySize}</div>
      </div>
    </div>
  )
}
