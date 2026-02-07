import DirectoryFilters from "./DirectoryFilters";
import DirectoryTable from "./DirectoryTable";
import { filterMembers } from "../../../utils/reportUtils";

export default function MemberDirectory({ members, filters, setFilters }) {
  const filtered = filterMembers(members, filters);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Member Directory</h2>

      <DirectoryFilters members={members} filters={filters} setFilters={setFilters} />

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-gray-600 mb-2">Complete contact information for filtered members</p>
        <p className="text-lg font-semibold text-gray-800">
          Showing {filtered.length} of {members.length} members
        </p>
      </div>

      <DirectoryTable members={filtered} />
    </div>
  );
}
