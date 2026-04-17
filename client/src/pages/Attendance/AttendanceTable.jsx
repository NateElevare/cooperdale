export default function AttendanceTable({
  attendance,
  members,
  events,
  onDelete,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">Member</th>
            <th className="px-4 py-3 text-left">Event</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {attendance.map((record) => {
            const member = members.find((m) => m.id === record.memberId);
            const event = events.find((e) => e.id === record.eventId);

            return (
              <tr key={record.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{member?.name ?? "-"}</td>
                <td className="px-4 py-3">{event?.name ?? "-"}</td>
                <td className="px-4 py-3">{record.date}</td>
                <td className="px-4 py-3">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
