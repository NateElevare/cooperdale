import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";

const MS_PER_DAY = 86400000;

function weeksLabel(weeks) {
  if (weeks === 1) return "Missed 1 week";
  return `Missed ${weeks} weeks`;
}

function getMissedGroups(members, attendance) {
  if (!attendance.length || !members.length) return [];

  // Most recent attendance date = reference point for "this week"
  const mostRecent = attendance.reduce((best, a) => (a.date > best ? a.date : best), "");
  if (!mostRecent) return [];

  const refDate = new Date(mostRecent + "T00:00:00");

  // Last attended date per member
  const lastByMember = {};
  for (const rec of attendance) {
    const id = rec.memberId;
    if (!lastByMember[id] || rec.date > lastByMember[id]) {
      lastByMember[id] = rec.date;
    }
  }

  const groups = {};

  for (const member of members) {
    const last = lastByMember[member.id];
    if (!last) continue; // never attended — skip

    const daysDiff = Math.round((refDate - new Date(last + "T00:00:00")) / MS_PER_DAY);
    const weeks = Math.floor(daysDiff / 7);

    if (weeks === 0) continue; // attended this week — no follow-up needed

    if (!groups[weeks]) groups[weeks] = [];
    groups[weeks].push({ member, lastAttended: last, weeksMissed: weeks });
  }

  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .map((weeks) => ({ weeks, entries: groups[weeks] }));
}

function LogFollowUpModal({ member, currentUser, onSave, onClose }) {
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        memberId: member.id,
        notes: notes.trim() || null,
        followedUpAt: date,
        followedUpBy: currentUser?.id || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">
          Log Follow-up — {member.name}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-800 text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="How did the follow-up go?"
              className="w-full px-3 py-2 rounded border border-zinc-700 bg-zinc-800 text-zinc-100 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowUpHistoryModal({ member, followups, onDelete, onClose }) {
  const memberFollowups = followups
    .filter((f) => f.memberId === member.id)
    .sort((a, b) => (a.followedUpAt > b.followedUpAt ? -1 : 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg bg-zinc-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">
          Follow-up History — {member.name}
        </h3>

        {memberFollowups.length === 0 ? (
          <p className="text-sm text-zinc-400">No follow-ups recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {memberFollowups.map((f) => (
              <div key={f.id} className="rounded border border-zinc-700 bg-zinc-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">{f.followedUpAt}</span>
                    {f.followedUpByUser && (
                      <span className="ml-2 text-xs text-zinc-400">by {f.followedUpByUser.displayName}</span>
                    )}
                    {f.notes && <p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{f.notes}</p>}
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(f.id)}
                      className="text-xs text-red-400 hover:text-red-300 shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function FollowUpPage({ members, attendance, followups, actions, currentUser, canWrite = true }) {
  const [logModal, setLogModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  function toggleGroup(weeks) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(weeks)) next.delete(weeks);
      else next.add(weeks);
      return next;
    });
  }

  const groups = useMemo(() => getMissedGroups(members, attendance), [members, attendance]);

  // Map memberId -> most recent follow-up
  const lastFollowupByMember = useMemo(() => {
    const map = {};
    for (const f of followups) {
      if (!map[f.memberId] || f.followedUpAt > map[f.memberId].followedUpAt) {
        map[f.memberId] = f;
      }
    }
    return map;
  }, [followups]);

  if (groups.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Follow Up</h2>
        <p className="text-zinc-400 text-sm">No attendance data yet, or everyone attended the most recent service.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Follow Up</h2>

      {groups.map(({ weeks, entries }) => {
        const isCollapsed = !expandedGroups.has(weeks);
        return (
        <div key={weeks} className="rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
          <button
            className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 ${weeks === 1 ? "bg-yellow-900/30" : weeks === 2 ? "bg-orange-900/30" : "bg-red-900/30"} ${isCollapsed ? "" : "border-b border-zinc-700"}`}
            onClick={() => toggleGroup(weeks)}
          >
            <h3 className="font-semibold text-zinc-100">
              {weeksLabel(weeks)}
              <span className="ml-2 text-sm font-normal text-zinc-400">{entries.length} {entries.length === 1 ? "person" : "people"}</span>
            </h3>
            <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronDown} className="text-zinc-400 text-sm" />
          </button>

          {!isCollapsed && <div className="divide-y divide-zinc-800">
            {entries.map(({ member, lastAttended }) => {
              const lastFollowup = lastFollowupByMember[member.id];
              const followupCount = followups.filter((f) => f.memberId === member.id).length;

              return (
                <div key={member.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <div className="font-medium text-zinc-100">{member.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Last attended: {lastAttended}
                      {lastFollowup && (
                        <span className="ml-3 text-zinc-500">
                          Last follow-up: {lastFollowup.followedUpAt}
                          {lastFollowup.notes && ` — ${lastFollowup.notes.slice(0, 60)}${lastFollowup.notes.length > 60 ? "..." : ""}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {followupCount > 0 && (
                      <button
                        onClick={() => setHistoryModal(member)}
                        className="text-xs rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                      >
                        History ({followupCount})
                      </button>
                    )}
                    {canWrite && (
                      <button
                        onClick={() => setLogModal(member)}
                        className="text-xs rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                      >
                        Log Follow-up
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
        );
      })}

      {logModal && (
        <LogFollowUpModal
          member={logModal}
          currentUser={currentUser}
          onSave={actions.addFollowup}
          onClose={() => setLogModal(null)}
        />
      )}

      {historyModal && (
        <FollowUpHistoryModal
          member={historyModal}
          followups={followups}
          onDelete={canWrite ? actions.deleteFollowup : null}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
}
