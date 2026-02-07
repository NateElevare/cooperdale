import { useMemo } from "react";

export default function EventForm({ event, setEvent, onSave, onCancel }) {
  const canSave = useMemo(() => {
    return Boolean(event?.name?.trim()) && Boolean(event?.date);
  }, [event]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold mb-4">New Event</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Event Name *"
          value={event.name}
          onChange={(e) => setEvent({ ...event, name: e.target.value })}
          className="px-3 py-2 border rounded"
        />

        <select
          value={event.type}
          onChange={(e) => setEvent({ ...event, type: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="weekly">Weekly</option>
          <option value="special">Special Event</option>
        </select>

        <input
          type="date"
          value={event.date}
          onChange={(e) => setEvent({ ...event, date: e.target.value })}
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
          Save Event
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
