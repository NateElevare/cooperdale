import { useMemo, useState } from "react";

export default function AttendanceForm({
  value,
  onChange,
  onSave,
  onCancel,
  members,
  events,
}) {
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(() => {
    if (value.memberIds?.length > 0) return value.memberIds.map((id) => String(id));
    if (value.memberId) return [String(value.memberId)];
    return [];
  }, [value.memberId, value.memberIds]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => String(m.name || "").toLowerCase().includes(q));
  }, [members, search]);

  function setSelected(memberIds) {
    onChange({ ...value, memberId: "", memberIds });
  }

  function toggleMember(memberId) {
    const id = String(memberId);
    if (selectedIds.includes(id)) {
      setSelected(selectedIds.filter((x) => x !== id));
    } else {
      setSelected([...selectedIds, id]);
    }
  }

  function selectFiltered() {
    const merged = new Set(selectedIds);
    filteredMembers.forEach((m) => merged.add(String(m.id)));
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

          <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-gray-600 px-1 py-2">No matching members.</p>
            ) : (
              filteredMembers.map((m) => {
                const id = String(m.id);
                const checked = selectedIds.includes(id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(m.id)}
                      className="h-4 w-4"
                    />
                    <span>{m.name}</span>
                  </label>
                );
              })
            )}
          </div>

          <p className="mt-2 text-xs text-gray-600">Selected: {selectedCount}</p>
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
