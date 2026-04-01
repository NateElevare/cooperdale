export default function QuarterlySummaryTable({ quarterlyReports }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Quarterly Membership and Attendance</h2>
        <p className="mt-1 text-sm text-gray-600">
          Membership totals use each member&apos;s membership date, then join date, then record
          created date as a fallback.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Quarter</th>
              <th className="px-4 py-3 text-left">New Members</th>
              <th className="px-4 py-3 text-left">Total Members</th>
              <th className="px-4 py-3 text-left">Events Held</th>
              <th className="px-4 py-3 text-left">Total Attendance</th>
              <th className="px-4 py-3 text-left">Unique Attendees</th>
              <th className="px-4 py-3 text-left">Avg Attendance / Event</th>
              <th className="px-4 py-3 text-left">Participation Rate</th>
            </tr>
          </thead>
          <tbody>
            {quarterlyReports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No quarterly data available yet.
                </td>
              </tr>
            ) : (
              quarterlyReports.map((row) => (
                <tr key={row.quarter} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.quarterLabel}</td>
                  <td className="px-4 py-3">{row.newMembers}</td>
                  <td className="px-4 py-3">{row.totalMembers}</td>
                  <td className="px-4 py-3">{row.eventsHeld}</td>
                  <td className="px-4 py-3">{row.totalAttendance}</td>
                  <td className="px-4 py-3">{row.uniqueAttendees}</td>
                  <td className="px-4 py-3">{row.avgAttendancePerEvent}</td>
                  <td className="px-4 py-3">{row.memberParticipationRate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
