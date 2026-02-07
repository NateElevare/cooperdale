import { getUniqueValues } from "../../../utils/reportUtils";

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg bg-white"
      >
        <option value="all">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DirectoryFilters({ members, filters, setFilters }) {
  const reset = () =>
    setFilters({
      firstName: "all",
      lastName: "all",
      street: "all",
      city: "all",
      state: "all",
      zip: "all",
    });

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-4">
      <h3 className="font-semibold text-lg">Filter Directory</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FilterSelect
          label="First Name"
          value={filters.firstName}
          onChange={(v) => setFilters({ ...filters, firstName: v })}
          options={getUniqueValues(members, "firstName")}
          allLabel="All First Names"
        />
        <FilterSelect
          label="Last Name"
          value={filters.lastName}
          onChange={(v) => setFilters({ ...filters, lastName: v })}
          options={getUniqueValues(members, "lastName")}
          allLabel="All Last Names"
        />
        <FilterSelect
          label="Street"
          value={filters.street}
          onChange={(v) => setFilters({ ...filters, street: v })}
          options={getUniqueValues(members, "street")}
          allLabel="All Streets"
        />
        <FilterSelect
          label="City"
          value={filters.city}
          onChange={(v) => setFilters({ ...filters, city: v })}
          options={getUniqueValues(members, "city")}
          allLabel="All Cities"
        />
        <FilterSelect
          label="State"
          value={filters.state}
          onChange={(v) => setFilters({ ...filters, state: v })}
          options={getUniqueValues(members, "state")}
          allLabel="All States"
        />
        <FilterSelect
          label="ZIP Code"
          value={filters.zip}
          onChange={(v) => setFilters({ ...filters, zip: v })}
          options={getUniqueValues(members, "zip")}
          allLabel="All ZIP Codes"
        />
      </div>

      <button
        onClick={reset}
        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
      >
        Clear All Filters
      </button>
    </div>
  );
}
