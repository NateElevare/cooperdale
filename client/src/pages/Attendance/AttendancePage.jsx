import { useState } from "react";
import AttendanceForm from "./AttendanceForm";
import AttendanceTable from "./AttendanceTable";

const emptyAttendance = () => ({
  memberId: "",
  memberIds: [],
  eventId: "",
  date: new Date().toISOString().split("T")[0],
});

export default function AttendancePage({ attendance, members, events, actions }) {
  const [showForm, setShowForm] = useState(false);
  const [newAttendance, setNewAttendance] = useState(emptyAttendance());

  async function onAdd() {
    const selectedMemberIds =
      newAttendance.memberIds?.length > 0
        ? newAttendance.memberIds
        : newAttendance.memberId
          ? [newAttendance.memberId]
          : [];

    if (selectedMemberIds.length === 0 || !newAttendance.eventId || !newAttendance.date) return;

    const records = selectedMemberIds.map((memberId) => ({
      memberId: Number(memberId),
      eventId: Number(newAttendance.eventId),
      date: newAttendance.date,
    }));

    const result = actions.addAttendanceBulk
      ? await actions.addAttendanceBulk(records)
      : await (async () => {
          let created = 0;
          let duplicates = 0;
          let failed = 0;

          for (const record of records) {
            try {
              await actions.addAttendance(record);
              created += 1;
            } catch (err) {
              const message = String(err?.message || "");
              if (message.includes("already exists") || message.includes("409")) {
                duplicates += 1;
              } else {
                failed += 1;
              }
            }
          }

          return { total: records.length, created, duplicates, failed };
        })();

    if (result.failed > 0 || result.duplicates > 0) {
      alert(
        `Attendance saved for ${result.created} member(s). ${result.duplicates} duplicate(s) skipped. ${result.failed} failed.`
      );
    }

    setNewAttendance(emptyAttendance());
    setShowForm(false);
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this attendance record?")) return;
    await actions.deleteAttendance(id);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Records</h2>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Record Attendance
        </button>
      </div>

      {showForm && (
        <AttendanceForm
          value={newAttendance}
          onChange={setNewAttendance}
          onSave={onAdd}
          onCancel={() => setShowForm(false)}
          members={members}
          events={events}
        />
      )}

      <AttendanceTable
        attendance={attendance}
        members={members}
        events={events}
        onDelete={onDelete}
      />
    </div>
  );
}
