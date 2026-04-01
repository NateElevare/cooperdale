import { useMemo } from "react";
import DirectoryFilters from "./DirectoryFilters";
import DirectoryTable from "./DirectoryTable";
import { filterMembers } from "../../../utils/reportUtils";
import { calculateAge } from "../../../utils/dateUtils";
import { downloadCsv } from "../../../utils/csv";

const DIRECTORY_EXPORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "street", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "age", label: "Age" },
  { key: "birthDate", label: "Birth Date" },
  { key: "membershipDate", label: "Member Since" },
  { key: "baptized", label: "Baptized" },
  { key: "baptismDate", label: "Baptism Date" },
];

export default function MemberDirectory({ members, filters, setFilters }) {
  const filtered = filterMembers(members, filters);
  const exportRows = useMemo(
    () =>
      members.map((member) => ({
        name: member.name || "",
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        phone: member.phone || "",
        street: member.street || "",
        city: member.city || "",
        state: member.state || "",
        zip: member.zip || "",
        age: calculateAge(member.birthDate),
        birthDate: member.birthDate || "",
        membershipDate: member.membershipDate || "",
        baptized: member.baptized ? "Yes" : "No",
        baptismDate: member.baptismDate || "",
      })),
    [members]
  );

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Member Directory</h2>

      <DirectoryFilters members={members} filters={filters} setFilters={setFilters} />

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-gray-600 mb-2">Complete contact information for filtered members</p>
        <p className="text-lg font-semibold text-gray-800">
          Showing {filtered.length} of {members.length} members
        </p>
      </div>

      <DirectoryTable members={filtered} />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
          onClick={() =>
            downloadCsv("membership-table.csv", DIRECTORY_EXPORT_COLUMNS, exportRows)
          }
        >
          Export Membership CSV
        </button>
      </div>
    </div>
  );
}
