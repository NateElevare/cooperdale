import { calculateAge, getAgeGroup } from "../../../utils/dateUtils";

export default function AttendanceByEventList({
  filteredAttendance,
  members,
  events,
  selectedEventFilter,
}) {
  const eventsToShow =
    selectedEventFilter === "all"
      ? events
      : events.filter((e) => e.id === Number(selectedEventFilter));

  return (
    <div className="space-y-4">
      {eventsToShow.map((event) => {
        const eventAttendance = filteredAttendance.filter((a) => a.eventId === event.id);

        const attendees = eventAttendance
          .map((a) => {
            const m = members.find((mm) => mm.id === a.memberId);
            return m ? { ...m, attendanceDate: a.date } : null;
          })
          .filter(Boolean);

        if (attendees.length === 0 && selectedEventFilter !== "all") {
          return (
            <div key={event.id} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">{event.name}</h3>
              <p className="text-gray-500 italic mt-2">No attendance records match the current filters.</p>
            </div>
          );
        }

        if (attendees.length === 0) return null;

        return (
          <div key={event.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{event.name}</h3>
                <p className="text-sm text-gray-600">
                  <span className="capitalize">{event.type}</span> • Created: {event.date}
                </p>
              </div>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Age</th>
                    <th className="px-3 py-2 text-left">Age Group</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">Attendance Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a, idx) => {
                    const age = a.birthDate ? calculateAge(a.birthDate) : "N/A";
                    const group = age !== "N/A" ? getAgeGroup(age) : "N/A";
                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-3 py-2 font-medium">{a.name}</td>
                        <td className="px-3 py-2">{age}</td>
                        <td className="px-3 py-2">{group}</td>
                        <td className="px-3 py-2">{a.email || "-"}</td>
                        <td className="px-3 py-2">{a.phone || "-"}</td>
                        <td className="px-3 py-2">{a.attendanceDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
