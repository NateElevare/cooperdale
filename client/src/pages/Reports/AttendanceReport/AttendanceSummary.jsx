export default function AttendanceSummary({ filteredAttendance, eventsCount, ageFilter }) {
  const uniqueMembers = new Set(filteredAttendance.map((a) => a.memberId));

  return (
    <div className="bg-green-50 p-4 rounded-lg mb-4 border-2 border-green-200">
      <h3 className="font-semibold text-lg mb-2">Results Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-600">Total Attendance Records</p>
          <p className="text-2xl font-bold text-green-700">{filteredAttendance.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Unique People</p>
          <p className="text-2xl font-bold text-green-700">{uniqueMembers.size}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Events Filtered</p>
          <p className="text-2xl font-bold text-green-700">{eventsCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Age Group</p>
          <p className="text-lg font-bold text-green-700">{ageFilter === "all" ? "All" : ageFilter}</p>
        </div>
      </div>
    </div>
  );
}
