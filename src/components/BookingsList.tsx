export interface Booking {
  id: number
  guest_name: string
  party_size: number
  status: string
  created_at: string
  activity: string
  start_time: string
}

interface Props {
  bookings: Booking[]
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function BookingsList({ bookings }: Props) {
  return (
    <div className="panel">
      <h2>Bookings</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Activity</th>
            <th>Time</th>
            <th>Party</th>
            <th>Status</th>
            <th>Booked</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.guest_name}</td>
              <td>{booking.activity}</td>
              <td>{booking.start_time}</td>
              <td>{booking.party_size}</td>
              <td>{booking.status.toLowerCase()}</td>
              <td>{formatCreatedAt(booking.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
