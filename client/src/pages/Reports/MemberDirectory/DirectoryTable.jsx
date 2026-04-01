import { calculateAge } from "../../../utils/dateUtils";

export default function DirectoryTable({ members }) {
  return (
    <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Phone</th>
            <th className="px-3 py-2 text-left">Address</th>
            <th className="px-3 py-2 text-left">Age</th>
            <th className="px-3 py-2 text-left">Birth Date</th>
            <th className="px-3 py-2 text-left">Member Since</th>
            <th className="px-3 py-2 text-left">Baptized</th>
          </tr>
        </thead>

        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{m.name}</td>
              <td className="px-3 py-2">{m.email || "-"}</td>
              <td className="px-3 py-2">{m.phone || "-"}</td>
              <td className="px-3 py-2">
                {(m.street || m.city || m.state || m.zip) ? (
                  <div>
                    {m.street && <div>{m.street}</div>}
                    {(m.city || m.state || m.zip) && (
                      <div>
                        {m.city}
                        {m.city && (m.state || m.zip) ? ", " : ""}
                        {m.state}
                        {m.state && m.zip ? " " : ""}
                        {m.zip}
                      </div>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-2">{calculateAge(m.birthDate)}</td>
              <td className="px-3 py-2">{m.birthDate || "-"}</td>
              <td className="px-3 py-2">{m.membershipDate || "-"}</td>
              <td className="px-3 py-2">
                {m.baptized ? (
                  <div>
                    <span className="text-green-600 font-medium">Yes</span>
                    {m.baptismDate && <div className="text-xs text-gray-500">{m.baptismDate}</div>}
                  </div>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
