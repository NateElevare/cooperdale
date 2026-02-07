export default function EventsList({ events, onDelete }) {
  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-gray-50 p-4 rounded-lg flex justify-between items-center"
        >
          <div>
            <h3 className="font-semibold text-lg">{event.name}</h3>
            <p className="text-gray-600">
              <span className="capitalize">{event.type}</span> - {event.date}
            </p>
          </div>

          <button
            onClick={() => onDelete(event.id)}
            className="text-red-600 hover:text-red-800"
            title="Delete event"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
