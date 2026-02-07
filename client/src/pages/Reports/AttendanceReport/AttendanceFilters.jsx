export default function AttendanceFilters({
  events,
  selectedEventFilter,
  setSelectedEventFilter,
  ageFilter,
  setAgeFilter,
  dateFilterType,
  setDateFilterType,
  singleDate,
  setSingleDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) {
  const clearAll = () => {
    setSelectedEventFilter("all");
    setAgeFilter("all");
    setDateFilterType("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-4">
      <h3 className="font-semibold text-lg">Filter Options</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-white"
          >
            <option value="all">All Ages</option>
            <option value="Children (0-12)">Children (0-12)</option>
            <option value="Youth (13-17)">Youth (13-17)</option>
            <option value="Young Adults (18-34)">Young Adults (18-34)</option>
            <option value="Adults (35-64)">Adults (35-64)</option>
            <option value="Seniors (65+)">Seniors (65+)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
          <select
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value);
              setSingleDate("");
              setStartDate("");
              setEndDate("");
            }}
            className="w-full px-3 py-2 border rounded-lg bg-white"
          >
            <option value="all">All Dates</option>
            <option value="single">Single Date</option>
            <option value="range">Date Range</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={clearAll}
            className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {dateFilterType === "single" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}

      {dateFilterType === "range" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
