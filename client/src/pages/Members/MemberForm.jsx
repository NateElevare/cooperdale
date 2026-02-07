import { useMemo } from "react";

export default function MemberForm({
  value,
  onChange,
  onSave,
  onCancel,
  title = "New Member",
  saveLabel = "Save Member",
}) {
  const canSave = useMemo(() => {
    return Boolean(value.firstName?.trim()) && Boolean(value.lastName?.trim());
  }, [value.firstName, value.lastName]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-4">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <input
            type="text"
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            className="px-3 py-2 border rounded w-full"
            maxLength={2}
            placeholder="OH"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
          <input
            type="text"
            value={value.zip}
            onChange={(e) => onChange({ ...value, zip: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
          <input
            type="date"
            value={value.birthDate}
            onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Visit Date</label>
          <input
            type="date"
            value={value.joinDate}
            onChange={(e) => onChange({ ...value, joinDate: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Church Membership Date</label>
          <input
            type="date"
            value={value.membershipDate}
            onChange={(e) => onChange({ ...value, membershipDate: e.target.value })}
            className="px-3 py-2 border rounded w-full"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="baptized"
            checked={Boolean(value.baptized)}
            onChange={(e) => onChange({ ...value, baptized: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="baptized" className="font-medium">Baptized</label>
        </div>

        {value.baptized && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baptism Date</label>
            <input
              type="date"
              value={value.baptismDate}
              onChange={(e) => onChange({ ...value, baptismDate: e.target.value })}
              className="px-3 py-2 border rounded w-full"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`px-4 py-2 rounded text-white ${
            canSave ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
          }`}
        >
          {saveLabel}
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
