export default function AgeGroupCards({ reportsByAge }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Attendance by Age Group</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(reportsByAge).map(([group, data]) => (
          <div
            key={group}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200"
          >
            <h3 className="font-semibold text-lg mb-2">{group}</h3>
            <p className="text-gray-600">Members: {data.count}</p>
            <p className="text-gray-600">Total Attendance: {data.totalAttendance}</p>
            <p className="text-gray-600">
              Avg per Member: {(data.totalAttendance / data.count).toFixed(1)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
