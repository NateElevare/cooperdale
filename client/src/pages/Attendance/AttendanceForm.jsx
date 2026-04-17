import { useMemo, useState } from "react";
import MemberForm from "../Members/MemberForm";

const emptyMember = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  joinDate: new Date().toISOString().split("T")[0],
  membershipDate: "",
  isMember: true,
  baptized: false,
  baptismDate: "",
  street: "",
  city: "",
  state: "",
  zip: "",
});

function formatGroupDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function MemberRow({ member, checked, onToggle }) {
  const id = String(member.id);
  return (
    <label className="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-800/50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(id)}
        className="h-4 w-4"
      />
      <span>{member.name}</span>
    </label>
  );
}

export default function AttendanceForm({
  value,
  onChange,
  onSave,
  onCancel,
  members,
  events,
  attendance,
  onAddMember,
}) {
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState(emptyMember());
  const [savingMember, setSavingMember] = useState(false);

  async function handleSaveMember() {
    if (!newMember.firstName || !newMember.lastName) return;
    setSavingMember(true);
    try {
      await onAddMember({ ...newMember, name: `${newMember.firstName} ${newMember.lastName}` });
      setNewMember(emptyMember());
      setShowAddMember(false);
    } finally {
      setSavingMember(false);
    }
  }

  const selectedIds = useMemo(() => {
    if (value.memberIds?.length > 0) return value.memberIds.map((id) => String(id));
    if (value.memberId) return [String(value.memberId)];
    return [];
  }, [value.memberId, value.memberIds]);

  // Build map of memberId -> most recent attendance date (excluding today's recording date)
  const lastAttendedByMember = useMemo(() => {
    const map = {};
    const recordingDate = value.date;
    for (const rec of (attendance || [])) {
      if (rec.date === recordingDate) continue;
      const id = String(rec.memberId);
      if (!map[id] || rec.date > map[id]) {
        map[id] = rec.date;
      }
    }
    return map;
  }, [attendance, value.date]);

  // Group members by most recent attendance date, sorted newest first, never-attended last
  const groupedMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? members.filter((m) => String(m.name || "").toLowerCase().includes(q))
      : members;

    if (q) return [{ label: null, members: pool }];

    const byDate = {};
    const never = [];

    for (const m of pool) {
      const last = lastAttendedByMember[String(m.id)];
      if (last) {
        if (!byDate[last]) byDate[last] = [];
        byDate[last].push(m);
      } else {
        never.push(m);
      }
    }

    const sortedDates = Object.keys(byDate).sort((a, b) => (a > b ? -1 : 1));
    const groups = sortedDates.map((date) => ({
      label: `Last attended: ${formatGroupDate(date)}`,
      members: byDate[date],
    }));

    if (never.length > 0) {
      groups.push({ label: "No attendance on record", members: never });
    }

    return groups;
  }, [members, search, lastAttendedByMember]);

  function setSelected(memberIds) {
    onChange({ ...value, memberId: "", memberIds });
  }

  function toggleMember(id) {
    if (selectedIds.includes(id)) {
      setSelected(selectedIds.filter((x) => x !== id));
    } else {
      setSelected([...selectedIds, id]);
    }
  }

  function selectFiltered() {
    const merged = new Set(selectedIds);
    groupedMembers.forEach((g) => g.members.forEach((m) => merged.add(String(m.id))));
    setSelected(Array.from(merged));
  }

  const selectedCount = selectedIds.length;
  const canSave = selectedCount > 0 && Boolean(value.eventId) && Boolean(value.date);

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold mb-2">New Attendance Record</h3>
      <p className="text-sm text-gray-600 mb-4">
        Select one or many members for the same event/date.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Members *</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectFiltered}
                className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800/70"
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-800/70"
              >
                Clear
              </button>
            </div>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name..."
            className="w-full px-3 py-2 border rounded mb-2"
          />

          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {groupedMembers.every((g) => g.members.length === 0) ? (
              <p className="text-sm text-gray-600 px-1 py-2">No matching members.</p>
            ) : (
              groupedMembers.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <div className="px-2 pt-3 pb-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.members.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        checked={selectedIds.includes(String(m.id))}
                        onToggle={toggleMember}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="mt-2 text-xs text-gray-600">Selected: {selectedCount}</p>

          {onAddMember && (
            <div className="mt-3">
              {showAddMember ? (
                <MemberForm
                  value={newMember}
                  onChange={setNewMember}
                  onSave={handleSaveMember}
                  onCancel={() => { setShowAddMember(false); setNewMember(emptyMember()); }}
                  title="Quick Add Member"
                  saveLabel={savingMember ? "Saving..." : "Save Member"}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  + Add new member
                </button>
              )}
            </div>
          )}
        </div>

        <select
          value={value.eventId}
          onChange={(e) => onChange({ ...value, eventId: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="">Select Event *</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="px-3 py-2 border rounded"
        />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`px-4 py-2 rounded text-white ${
            canSave ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
          }`}
        >
          Save Record
        </button>

        <button
          onClick={onCancel}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
