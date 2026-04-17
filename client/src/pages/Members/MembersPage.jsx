import { useMemo, useState } from "react";
import MemberForm from "./MemberForm";
import MembersTable from "./MembersTable";
import RelationshipsManager from "./RelationshipsManager";

const PAGE_SIZE = 20;

const emptyMember = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  joinDate: new Date().toISOString().split("T")[0],
  membershipDate: "",
  isMember: true,
  baptized: false,
  baptismDate: "",
  street: "",
  city: "",
  state: "",
  zip: "",
});

export default function MembersPage({ members, actions, attendance, events }) {
  const [showForm, setShowForm] = useState(false);
  const [newMember, setNewMember] = useState(emptyMember());
  const [editingMember, setEditingMember] = useState(null);
  const [relationshipMember, setRelationshipMember] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  // Search + sort across ALL members
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? members.filter((m) =>
          [m.name, m.email, m.phone, m.city, m.state]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        )
      : members;

    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "").toLowerCase();
      const bv = String(b[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function onSaveNew() {
    if (!newMember.firstName || !newMember.lastName) return;
    await actions.addMember({ ...newMember, name: `${newMember.firstName} ${newMember.lastName}` });
    setNewMember(emptyMember());
    setShowForm(false);
    setSearch("");
    setPage(1);
  }

  async function onSaveEdit() {
    const next = {
      ...editingMember,
      name: `${editingMember.firstName || ""} ${editingMember.lastName || ""}`.trim(),
    };
    await actions.updateMember(editingMember.id, next);
    setEditingMember(null);
  }

  async function onDelete(id) {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    await actions.deleteMember(id);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attendees</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Attendee
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <MemberForm
              value={newMember}
              onChange={setNewMember}
              onSave={onSaveNew}
              onCancel={() => setShowForm(false)}
              title="New Attendee"
              saveLabel="Save Attendee"
            />
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingMember(null)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <MemberForm
              value={editingMember}
              onChange={setEditingMember}
              onSave={onSaveEdit}
              onCancel={() => setEditingMember(null)}
              title="Edit Attendee"
              saveLabel="Save Changes"
            />
          </div>
        </div>
      )}

      {relationshipMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRelationshipMember(null)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-zinc-900 p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <RelationshipsManager
              member={relationshipMember}
              members={members}
              onClose={() => setRelationshipMember(null)}
            />
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, email, phone, or city..."
          className="w-full px-3 py-2 border rounded-lg text-gray-800"
        />
      </div>

      <MembersTable
        members={pageMembers}
        onEdit={setEditingMember}
        onDelete={onDelete}
        relationshipMember={relationshipMember}
        onManageRelationships={setRelationshipMember}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        attendance={attendance}
        events={events}
      />

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <span>
          Showing {filteredMembers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length} attendees
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            ‹
          </button>
          <span className="px-3 py-1">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
