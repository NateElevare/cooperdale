import { useState } from "react";
import EventForm from "./EventForm";
import EventsList from "./EventsList";

const emptyEvent = () => ({
  name: "",
  type: "weekly",
  date: new Date().toISOString().split("T")[0],
});

export default function EventsPage({ events, actions }) {
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState(emptyEvent());

  async function onSave() {
    if (!newEvent.name || !newEvent.date) return;
    await actions.addEvent(newEvent);
    setNewEvent(emptyEvent());
    setShowForm(false);
  }

  async function onDelete(id) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    await actions.deleteEvent(id);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Events</h2>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Event
        </button>
      </div>

      {showForm && (
        <EventForm
          event={newEvent}
          setEvent={setNewEvent}
          onSave={onSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      <EventsList events={events} onDelete={onDelete} />
    </div>
  );
}
