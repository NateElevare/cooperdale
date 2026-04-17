import { Fragment, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faSitemap, faTrash } from "@fortawesome/free-solid-svg-icons";
import { calculateAge } from "../../utils/members";

function SortTh({ label, sortField, sortKey, sortDir, onSort, mobileHidden = true }) {
  const active = sortKey === sortField;
  return (
    <th
      className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-200 whitespace-nowrap ${mobileHidden ? "hidden md:table-cell" : ""}`}
      onClick={() => onSort(sortField)}
    >
      {label}
      <span className="ml-1 text-xs text-gray-400">
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
}

function AttendanceHistory({ member, attendance, events }) {
  const eventsById = useMemo(() => {
    const map = new Map();
    (events || []).forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  const history = useMemo(() => {
    return (attendance || [])
      .filter((a) => a.memberId === member.id)
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [attendance, member.id]);

  if (history.length === 0) {
    return <p className="text-sm text-zinc-400">No attendance records found.</p>;
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-2">{history.length} event{history.length !== 1 ? "s" : ""} attended</p>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {history.map((rec) => {
          const event = eventsById.get(rec.eventId);
          return (
            <div key={rec.id ?? `${rec.memberId}-${rec.eventId}-${rec.date}`} className="flex items-center gap-4 text-sm px-2 py-1 rounded bg-zinc-800/50">
              <span className="text-zinc-300 w-28 shrink-0">{rec.date}</span>
              <span className="text-zinc-100 font-medium">{event?.name || "Unknown event"}</span>
              {event?.type && <span className="text-zinc-400 text-xs">{event.type}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MembersTable({
  members,
  onEdit,
  onDelete,
  relationshipMember,
  onManageRelationships,
  sortKey,
  sortDir,
  onSort,
  attendance,
  events,
  canWrite = true,
}) {
  const [historyMemberId, setHistoryMemberId] = useState(null);

  function toggleHistory(id) {
    setHistoryMemberId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <SortTh label="Name" sortField="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} mobileHidden={false} />
            <SortTh label="City" sortField="city" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Email" sortField="email" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Phone" sortField="phone" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Age" sortField="birthDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Since" sortField="membershipDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Member" sortField="isMember" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="Baptized" sortField="baptized" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th className="px-2 py-3 text-left whitespace-nowrap w-px">Actions</th>
          </tr>
        </thead>

        <tbody>
          {members.map((member) => {
            const isHistoryOpen = historyMemberId === member.id;

            return (
              <Fragment key={member.id}>
                <tr
                  className={`border-b hover:bg-gray-50 cursor-pointer ${isHistoryOpen ? "bg-gray-50" : ""}`}
                  onClick={() => toggleHistory(member.id)}
                >
                  <td className="px-3 py-2 font-medium">
                    <span className="mr-1 text-xs text-gray-400">{isHistoryOpen ? "▼" : "▶"}</span>
                    {member.name}
                  </td>

                  <td className="px-3 py-2 text-sm hidden md:table-cell">
                    {member.city || member.state
                      ? [member.city, member.state].filter(Boolean).join(", ")
                      : <span className="text-gray-400">-</span>}
                  </td>

                  <td className="px-3 py-2 text-sm hidden md:table-cell">{member.email || "-"}</td>
                  <td className="px-3 py-2 text-sm hidden md:table-cell">{member.phone || "-"}</td>
                  <td className="px-3 py-2 text-sm hidden md:table-cell">{calculateAge(member.birthDate)}</td>
                  <td className="px-3 py-2 text-sm hidden md:table-cell">{member.membershipDate || "-"}</td>

                  <td className="px-3 py-2 text-sm hidden md:table-cell">
                    {member.isMember ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>

                  <td className="px-3 py-2 text-sm hidden md:table-cell">
                    {member.baptized ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>

                  <td className="px-2 py-2 whitespace-nowrap w-px" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      {canWrite && (
                        <button
                          onClick={() => onEdit?.(member)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faPencil} />
                        </button>
                      )}
                      {canWrite && (
                        <button
                          onClick={() => onManageRelationships?.(member)}
                          className="text-emerald-600 hover:text-emerald-500"
                          title="Relationships"
                        >
                          <FontAwesomeIcon icon={faSitemap} />
                        </button>
                      )}
                      {canWrite && (
                        <button
                          onClick={() => onDelete(member.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {isHistoryOpen && (
                  <tr className="border-b bg-zinc-950/40">
                    <td colSpan={9} className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-200 mb-2">
                        Attendance History — {member.name}
                      </p>
                      <AttendanceHistory member={member} attendance={attendance} events={events} />
                    </td>
                  </tr>
                )}


              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
