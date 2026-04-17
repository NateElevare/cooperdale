import { useState } from "react";
import MemberForm from "./MemberForm";
import MembersTable from "./MembersTable";

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

export default function MembersPage({ members, actions }) {
  const [showForm, setShowForm] = useState(false);
  const [newMember, setNewMember] = useState(emptyMember());
  const [editingMember, setEditingMember] = useState(null);
  const [relationshipMember, setRelationshipMember] = useState(null);

  async function onSaveNew() {
    if (!newMember.firstName || !newMember.lastName) return;
    await actions.addMember({ ...newMember, name: `${newMember.firstName} ${newMember.lastName}` });
    setNewMember(emptyMember());
    setShowForm(false);
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
        <h2 className="text-2xl font-bold text-gray-800">Members</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Member
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <MemberForm
            value={newMember}
            onChange={setNewMember}
            onSave={onSaveNew}
            onCancel={() => setShowForm(false)}
            title="New Member"
            saveLabel="Save Member"
          />
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-xl">
            <MemberForm
              value={editingMember}
              onChange={setEditingMember}
              onSave={onSaveEdit}
              onCancel={() => setEditingMember(null)}
              title="Edit Member"
              saveLabel="Save Changes"
            />
          </div>
        </div>
      )}

      <MembersTable
        members={members}
        onEdit={setEditingMember}
        onDelete={onDelete}
        relationshipMember={relationshipMember}
        onManageRelationships={setRelationshipMember}
      />
    </div>
  );
}
