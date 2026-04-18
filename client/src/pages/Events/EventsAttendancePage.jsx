import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import MemberForm from "../Members/MemberForm";
import { AttendanceApi } from "../../api/attendance";

const EVENT_TYPES = [
  { key: "sunday_morning", label: "Sunday Morning" },
  { key: "sunday_evening", label: "Sunday Evening" },
  { key: "wednesday", label: "Wednesday" },
  { key: "special", label: "Special Event" },
];

// Legacy types imported from old data map to sunday_morning
const TYPE_ALIASES = {
  sunday_morning: ["sunday_morning", "sunday", "weekly"],
  sunday_evening: ["sunday_evening"],
  wednesday: ["wednesday"],
  special: ["special"],
};

const emptyMember = () => ({
  firstName: "", lastName: "", email: "", phone: "", birthDate: "",
  joinDate: new Date().toISOString().split("T")[0], membershipDate: "",
  isMember: true, baptized: false, baptismDate: "",
  street: "", city: "", state: "", zip: "",
});

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Attendance checklist shown inside an expanded event row ──────────────────
function AttendancePanel({ event, allAttendance, members, actions, canWrite }) {
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState(emptyMember());
  const [savingMember, setSavingMember] = useState(false);
  const [inFlight, setInFlight] = useState(new Set()); // memberIds being toggled

  // Local optimistic state, kept in sync with allAttendance prop
  const [localAttended, setLocalAttended] = useState(() =>
    new Set(allAttendance.filter((r) => r.eventId === event.id).map((r) => r.memberId))
  );
  const recordsRef = useRef(new Map(
    allAttendance.filter((r) => r.eventId === event.id).map((r) => [r.memberId, r])
  ));

  // Sync when allAttendance updates (after background refresh)
  useEffect(() => {
    const eventRecs = allAttendance.filter((r) => r.eventId === event.id);
    setLocalAttended(new Set(eventRecs.map((r) => r.memberId)));
    recordsRef.current = new Map(eventRecs.map((r) => [r.memberId, r]));
  }, [allAttendance, event.id]);

  async function toggle(memberId) {
    if (inFlight.has(memberId)) return;
    const attended = localAttended.has(memberId);

    // Optimistic update
    setLocalAttended((prev) => {
      const next = new Set(prev);
      attended ? next.delete(memberId) : next.add(memberId);
      return next;
    });
    setInFlight((prev) => new Set(prev).add(memberId));

    try {
      if (attended) {
        const rec = recordsRef.current.get(memberId);
        if (rec) await AttendanceApi.remove(rec.id);
      } else {
        await AttendanceApi.create({ memberId, eventId: event.id, date: event.date });
      }
      // Lightweight refresh — only updates attendance state in App
      await actions.refreshAttendance();
    } catch {
      // Revert on failure
      setLocalAttended((prev) => {
        const next = new Set(prev);
        attended ? next.add(memberId) : next.delete(memberId);
        return next;
      });
    } finally {
      setInFlight((prev) => { const next = new Set(prev); next.delete(memberId); return next; });
    }
  }

  async function handleSaveMember() {
    if (!newMember.firstName || !newMember.lastName) return;
    setSavingMember(true);
    try {
      await actions.addMember({ ...newMember, name: `${newMember.firstName} ${newMember.lastName}` });
      setNewMember(emptyMember());
      setShowAddMember(false);
    } finally {
      setSavingMember(false);
    }
  }

  // Group members by most recent attendance (excluding this event's date)
  const lastAttendedByMember = useMemo(() => {
    const map = {};
    for (const rec of allAttendance) {
      if (rec.date === event.date) continue;
      const id = rec.memberId;
      if (!map[id] || rec.date > map[id]) map[id] = rec.date;
    }
    return map;
  }, [allAttendance, event.date]);

  const groupedMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? members.filter((m) => String(m.name || "").toLowerCase().includes(q))
      : members;

    if (q) return [{ label: null, members: pool }];

    const byDate = {};
    const never = [];
    for (const m of pool) {
      const last = lastAttendedByMember[m.id];
      if (last) {
        if (!byDate[last]) byDate[last] = [];
        byDate[last].push(m);
      } else {
        never.push(m);
      }
    }

    const sortedDates = Object.keys(byDate).sort((a, b) => (a > b ? -1 : 1));
    const groups = sortedDates.map((date) => {
      const [y, mo, d] = date.split("-").map(Number);
      const label = new Date(y, mo - 1, d).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
      return { label: `Last attended ${label}`, members: byDate[date] };
    });
    if (never.length) groups.push({ label: "No attendance on record", members: never });
    return groups;
  }, [members, search, lastAttendedByMember]);

  const attendedCount = localAttended.size;

  return (
    <div className="border-t border-zinc-700 bg-zinc-950/40 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">
          {attendedCount} {attendedCount === 1 ? "person" : "people"} marked attended
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-48 px-2 py-1 text-sm rounded border border-zinc-700 bg-zinc-900 text-zinc-100"
        />
      </div>

      <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
        {groupedMembers.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-2 pt-3 pb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {group.label}
              </div>
            )}
            {group.members.map((m) => {
              const checked = localAttended.has(m.id);
              const pending = inFlight.has(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer select-none hover:bg-zinc-800/60 ${pending ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => canWrite && toggle(m.id)}
                    disabled={!canWrite || pending}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className={`text-sm ${checked ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>
                    {m.name}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {canWrite && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
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
              onClick={() => setShowAddMember(true)}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              + Add new member
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single event row ─────────────────────────────────────────────────────────
function EventRow({ event, allAttendance, canWriteEvents, onOpen, onDelete }) {
  const attendanceCount = useMemo(
    () => allAttendance.filter((r) => r.eventId === event.id).length,
    [allAttendance, event.id]
  );

  return (
    <div className="rounded-xl border border-zinc-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/50 text-left"
        onClick={onOpen}
      >
        <div className="font-medium text-zinc-100">{formatDate(event.date)}</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{attendanceCount} attended</span>
          {canWriteEvents && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
              title="Delete event"
            >
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          )}
        </div>
      </button>
    </div>
  );
}

// ── Attendance modal ──────────────────────────────────────────────────────────
function AttendanceModal({ event, allAttendance, members, actions, canWrite, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <div>
            <h3 className="font-semibold text-zinc-100">{formatDate(event.date)}</h3>
            {event.name && <p className="text-xs text-zinc-400 mt-0.5">{event.name}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-xl leading-none">&times;</button>
        </div>
        <AttendancePanel
          event={event}
          allAttendance={allAttendance}
          members={members}
          actions={actions}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EventsAttendancePage({ events, attendance, members, actions, canWriteEvents, canWriteAttendance }) {
  const [selectedType, setSelectedType] = useState("sunday_morning");
  const [openEventId, setOpenEventId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [addingEvent, setAddingEvent] = useState(false);

  const typeLabel = EVENT_TYPES.find((t) => t.key === selectedType)?.label || selectedType;

  const typeEvents = useMemo(() => {
    const aliases = TYPE_ALIASES[selectedType] || [selectedType];
    return events
      .filter((e) => aliases.includes(e.type))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [events, selectedType]);

  async function handleAddEvent() {
    if (!newDate) return;
    setAddingEvent(true);
    try {
      await actions.addEvent({ name: typeLabel, type: selectedType, date: newDate });
      // Open the newly created event (it will be the first after sort)
      setShowAddForm(false);
    } finally {
      setAddingEvent(false);
    }
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Events</h2>
      </div>

      {/* Type selector + add button on one row */}
      <div className="flex flex-wrap items-center gap-2">
        {EVENT_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setSelectedType(t.key); setOpenEventId(null); setShowAddForm(false); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === t.key
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}

        {canWriteEvents && (
          <div className="ml-auto flex items-center gap-2">
            {showAddForm ? (
              <>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="px-2 py-1.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm"
                />
                <button
                  onClick={handleAddEvent}
                  disabled={addingEvent || !newDate}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingEvent ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                + Add {typeLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Event list */}
      {typeEvents.length === 0 ? (
        <p className="text-sm text-zinc-400">No {typeLabel} events recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {typeEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              allAttendance={attendance}
              canWriteEvents={canWriteEvents}
              onOpen={() => setOpenEventId(event.id)}
              onDelete={async () => {
                if (!window.confirm(`Delete "${event.name}" on ${event.date}? This will also remove all attendance records.`)) return;
                await actions.deleteEvent(event.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Attendance modal */}
      {openEventId && (() => {
        const event = typeEvents.find((e) => e.id === openEventId);
        if (!event) return null;
        return (
          <AttendanceModal
            event={event}
            allAttendance={attendance}
            members={members}
            actions={actions}
            canWrite={canWriteAttendance}
            onClose={() => setOpenEventId(null)}
          />
        );
      })()}
    </div>
  );
}
