import { calculateAge } from "../../../utils/dateUtils";

function statusFor(count) {
  if (count === 0) return { label: "Inactive", cls: "bg-red-100 text-red-800" };
  if (count < 3) return { label: "Occasional", cls: "bg-yellow-100 text-yellow-800" };
  return { label: "Regular", cls: "bg-green-100 text-green-800" };
}

export default function MemberFrequencyTable({ members }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Member Attendance Frequency</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Total Events Attended</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const s = statusFor(m.attendanceCount);
              return (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{calculateAge(m.birthDate)}</td>
                  <td className="px-4 py-3">{m.attendanceCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${s.cls}`}>{s.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
