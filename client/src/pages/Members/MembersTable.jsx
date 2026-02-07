import { Fragment } from "react";
import { calculateAge } from "../../utils/members";
import RelationshipsManager from "./RelationshipsManager";

export default function MembersTable({
  members,
  onEdit,
  onDelete,
  relationshipMember,
  onManageRelationships,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Address</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-left">Age</th>
            <th className="px-4 py-3 text-left">Member Since</th>
            <th className="px-4 py-3 text-left">Baptized</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {members.map((member) => {
            const isRelationshipsOpen = relationshipMember?.id === member.id;

            return (
              <Fragment key={member.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{member.name}</td>

                  <td className="px-4 py-3">
                    {member.street || member.city || member.state || member.zip ? (
                      <div className="text-sm">
                        {member.street && <div>{member.street}</div>}
                        {(member.city || member.state || member.zip) && (
                          <div>
                            {member.city}
                            {member.city && (member.state || member.zip) ? ", " : ""}
                            {member.state}
                            {member.state && member.zip ? " " : ""}
                            {member.zip}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3">{member.email || "-"}</td>
                  <td className="px-4 py-3">{member.phone || "-"}</td>
                  <td className="px-4 py-3">{calculateAge(member.birthDate)}</td>
                  <td className="px-4 py-3">{member.membershipDate || "-"}</td>

                  <td className="px-4 py-3">
                    {member.baptized ? (
                      <div>
                        <span className="text-green-600 font-medium">Yes</span>
                        {member.baptismDate && (
                          <div className="text-xs text-gray-500">{member.baptismDate}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit?.(member)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onManageRelationships?.(isRelationshipsOpen ? null : member)}
                      className="text-emerald-600 hover:text-emerald-500 mr-3"
                      title="Relationships"
                    >
                      Relationships
                    </button>
                    <button
                      onClick={() => onDelete(member.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {isRelationshipsOpen && (
                  <tr className="border-b bg-zinc-950/40">
                    <td colSpan={8} className="px-4 py-3">
                      <RelationshipsManager
                        member={member}
                        members={members}
                        onClose={() => onManageRelationships?.(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
