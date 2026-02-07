export default function MonthlySummaryTable({ monthlyReports }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Monthly Attendance Summary</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Month</th>
              <th className="px-4 py-3 text-left">Total Attendance</th>
              <th className="px-4 py-3 text-left">Unique Attendees</th>
              <th className="px-4 py-3 text-left">Avg per Event</th>
            </tr>
          </thead>
          <tbody>
            {monthlyReports.map((r) => (
              <tr key={r.month} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.month}</td>
                <td className="px-4 py-3">{r.totalAttendance}</td>
                <td className="px-4 py-3">{r.uniqueAttendees}</td>
                <td className="px-4 py-3">{r.avgPerEvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
