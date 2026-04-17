import { useCallback, useEffect, useMemo, useState } from "react";
import { MembersApi } from "../../api/members";

const RELATION_OPTIONS = [
  "spouse",
  "parent",
  "child",
  "sibling",
  "step-parent",
  "step-child",
  "step-sibling",
  "guardian",
  "ward",
  "grandparent",
  "grandchild",
  "great-grandparent",
  "great-grandchild",
  "aunt/uncle",
  "niece/nephew",
  "great-aunt/uncle",
  "great-niece/nephew",
  "mother-in-law",
  "father-in-law",
  "son-in-law",
  "daughter-in-law",
  "brother-in-law",
  "sister-in-law",
  "cousin",
  "other",
];

const RELATION_LEVEL_DELTA = {
  spouse: 0,
  sibling: 0,
  "step-sibling": 0,
  "brother-in-law": 0,
  "sister-in-law": 0,
  cousin: 0,
  other: 0,
  parent: -1,
  "step-parent": -1,
  guardian: -1,
  "mother-in-law": -1,
  "father-in-law": -1,
  child: 1,
  "step-child": 1,
  ward: 1,
  "son-in-law": 1,
  "daughter-in-law": 1,
  grandparent: -2,
  "great-grandparent": -3,
  "aunt/uncle": -1,
  "great-aunt/uncle": -2,
  grandchild: 2,
  "great-grandchild": 3,
  "niece/nephew": 1,
  "great-niece/nephew": 2,
};

function displayName(member) {
  if (!member) return "";
  return member.name || `${member.firstName || ""} ${member.lastName || ""}`.trim() || `#${member.id}`;
}

function FamilyTreeEditor({ member, members, onRootRelationshipsUpdated }) {
  const [tree, setTree] = useState(null);
  const [graph, setGraph] = useState({});
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [formState, setFormState] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(member?.id || null);

  const membersById = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const generateTree = useCallback(async () => {
    if (!member?.id) return;
    setLoadingTree(true);
    setTreeError("");

    try {
      const nextGraph = {};
      const discovered = new Set([member.id]);
      let frontier = [member.id];
      let depth = 0;
      const maxDepth = 4;

      while (frontier.length > 0 && depth <= maxDepth) {
        const batch = frontier;
        frontier = [];

        const results = await Promise.all(
          batch.map(async (memberId) => [memberId, await MembersApi.listRelationships(memberId)])
        );

        results.forEach(([memberId, rows]) => {
          nextGraph[memberId] = rows;
          rows.forEach((rel) => {
            const relatedId = rel?.relatedMember?.id;
            if (Number.isFinite(relatedId) && !discovered.has(relatedId)) {
              discovered.add(relatedId);
              frontier.push(relatedId);
            }
          });
        });

        depth += 1;
      }

      setGraph(nextGraph);
      setTree({ id: member.id });
    } catch (err) {
      setTreeError(err?.message || "Failed to generate family tree");
    } finally {
      setLoadingTree(false);
    }
  }, [member?.id]);

  useEffect(() => {
    generateTree();
  }, [generateTree]);

  useEffect(() => {
    setSelectedNodeId(member?.id || null);
  }, [member?.id]);

  async function onAddFromTree(sourceMemberId, relatedMemberId, relationType) {
    try {
      setTreeError("");
      await MembersApi.addRelationship(sourceMemberId, {
        relatedMemberId,
        relationType,
        reciprocal: true,
      });
      await Promise.all([generateTree(), onRootRelationshipsUpdated()]);
    } catch (err) {
      setTreeError(err?.message || "Failed to add relationship");
    }
  }

  async function onRemoveFromTree(sourceMemberId, relationshipId) {
    try {
      setTreeError("");
      await MembersApi.removeRelationship(sourceMemberId, relationshipId);
      await Promise.all([generateTree(), onRootRelationshipsUpdated()]);
    } catch (err) {
      setTreeError(err?.message || "Failed to remove relationship");
    }
  }

  const layout = useMemo(() => {
    if (!tree || !member?.id) return null;

    const nodeWidth = 150;
    const nodeHeight = 54;
    const gapX = 28;
    const gapY = 56;
    const padX = 24;
    const padY = 24;

    const nodeIds = new Set([member.id]);
    const rawEdges = [];
    const visitQueue = [member.id];
    const visited = new Set();

    while (visitQueue.length > 0) {
      const current = visitQueue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const rels = graph[current] || [];

      rels.forEach((rel) => {
        const target = rel?.relatedMember?.id;
        if (!Number.isFinite(target)) return;
        nodeIds.add(target);
        rawEdges.push({
          from: current,
          to: target,
          relationType: rel.relationType || "other",
        });
        if (!visited.has(target)) visitQueue.push(target);
      });
    }

    const levelsById = new Map();
    const subtitleById = new Map();
    levelsById.set(member.id, 0);
    subtitleById.set(member.id, "you");
    const levelQueue = [member.id];

    while (levelQueue.length > 0) {
      const current = levelQueue.shift();
      const currentLevel = levelsById.get(current) ?? 0;
      const rels = graph[current] || [];

      rels.forEach((rel) => {
        const target = rel?.relatedMember?.id;
        if (!Number.isFinite(target)) return;
        const delta = RELATION_LEVEL_DELTA[rel.relationType] ?? 0;
        const proposed = currentLevel + delta;
        if (!levelsById.has(target)) {
          levelsById.set(target, proposed);
          subtitleById.set(target, rel.relationType || "other");
          levelQueue.push(target);
        }
      });
    }

    nodeIds.forEach((id) => {
      if (!levelsById.has(id)) levelsById.set(id, 0);
      if (!subtitleById.has(id)) subtitleById.set(id, "other");
    });

    const minAssignedLevel = Math.min(...Array.from(levelsById.values()));
    const maxAssignedLevel = Math.max(...Array.from(levelsById.values()));
    const maxAbs = Math.max(1, Math.abs(minAssignedLevel), Math.abs(maxAssignedLevel));
    const minLevel = -maxAbs;
    const maxLevel = maxAbs;
    const rowCount = maxLevel - minLevel + 1;
    const rows = Array.from({ length: rowCount }, () => []);

    Array.from(nodeIds).forEach((id) => {
      const level = levelsById.get(id) ?? 0;
      rows[level - minLevel].push({
        key: String(id),
        id,
        label: displayName(membersById.get(id) || { id }),
        subtitle: subtitleById.get(id) || "other",
      });
    });

    rows.forEach((row) => {
      row.sort((a, b) => a.label.localeCompare(b.label));
    });

    const levelWidths = rows.map((row) => row.length * nodeWidth + Math.max(0, row.length - 1) * gapX);
    const svgWidth = Math.max(860, ...levelWidths.map((w) => w + padX * 2));
    const svgHeight = rowCount * nodeHeight + Math.max(0, rowCount - 1) * gapY + padY * 2 + 12;

    const positioned = new Map();
    rows.forEach((row, rowIndex) => {
      const rowWidth = row.length * nodeWidth + Math.max(0, row.length - 1) * gapX;
      const startX = (svgWidth - rowWidth) / 2;
      const y = padY + rowIndex * (nodeHeight + gapY);

      row.forEach((n, idx) => {
        const x = startX + idx * (nodeWidth + gapX);
        positioned.set(n.key, {
          ...n,
          x,
          y,
          w: nodeWidth,
          h: nodeHeight,
          cx: x + nodeWidth / 2,
          cy: y + nodeHeight / 2,
        });
      });
    });

    const seenPairs = new Set();
    const positionedEdges = [];
    rawEdges.forEach((edge) => {
      const pairKey = edge.from < edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`;
      if (seenPairs.has(pairKey)) return;
      const from = positioned.get(String(edge.from));
      const to = positioned.get(String(edge.to));
      if (!from || !to) return;
      seenPairs.add(pairKey);
      positionedEdges.push({ from, to });
    });

    const positionedNodes = Array.from(positioned.values());

    return {
      nodes: positionedNodes,
      edges: positionedEdges,
      width: svgWidth,
      height: svgHeight,
    };
  }, [graph, member?.id, membersById, tree]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return membersById.get(selectedNodeId) || { id: selectedNodeId };
  }, [membersById, selectedNodeId]);

  const selectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return graph[selectedNodeId] || [];
  }, [graph, selectedNodeId]);

  const selectedForm = formState[selectedNodeId] || {
    relatedMemberId: "",
    relationType: "spouse",
  };

  return (
    <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-zinc-100">Family Tree Editor</h4>
        <button
          type="button"
          onClick={generateTree}
          disabled={loadingTree}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {loadingTree ? "Generating..." : "Regenerate Tree"}
        </button>
      </div>

      {treeError && <p className="mb-2 text-sm text-red-400">{treeError}</p>}
      {loadingTree ? (
        <p className="text-sm text-zinc-400">Generating family tree...</p>
      ) : !tree ? (
        <p className="text-sm text-zinc-400">No family tree to show yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded border border-zinc-700 bg-zinc-900/50 p-2">
            <svg width={layout.width} height={layout.height} role="img" aria-label="Family tree graph">
              {layout.edges.map((edge, idx) => {
                const fromIsAbove = edge.from.cy <= edge.to.cy;
                const y1 = fromIsAbove ? edge.from.y + edge.from.h : edge.from.y;
                const y2 = fromIsAbove ? edge.to.y : edge.to.y + edge.to.h;
                const midY = (y1 + y2) / 2;
                const sameRow = Math.abs(edge.from.y - edge.to.y) < 1;
                const path = sameRow
                  ? `M ${edge.from.cx} ${edge.from.cy} H ${edge.to.cx}`
                  : `M ${edge.from.cx} ${y1} V ${midY} H ${edge.to.cx} V ${y2}`;
                return (
                  <g key={`${edge.from.key}-${edge.to.key}-${idx}`} stroke="#94a3b8" strokeWidth="1.5" fill="none">
                    <path d={path} />
                  </g>
                );
              })}

              {layout.nodes.map((n) => {
                const isSelected = selectedNodeId === n.id;
                return (
                  <g key={n.key}>
                    <rect
                      x={n.x}
                      y={n.y}
                      rx="10"
                      ry="10"
                      width={n.w}
                      height={n.h}
                      fill={isSelected ? "#1e3a8a" : "#ffffff"}
                      stroke={isSelected ? "#60a5fa" : "#475569"}
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onClick={() => setSelectedNodeId(n.id)}
                    />
                    <text
                      x={n.x + n.w / 2}
                      y={n.y + 21}
                      textAnchor="middle"
                      fontSize="12"
                      fill={isSelected ? "#e2e8f0" : "#0f172a"}
                      className="pointer-events-none"
                    >
                      {n.label.length > 22 ? `${n.label.slice(0, 22)}...` : n.label}
                    </text>
                    <text
                      x={n.x + n.w / 2}
                      y={n.y + 39}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isSelected ? "#bfdbfe" : "#334155"}
                      className="pointer-events-none"
                    >
                      {n.subtitle}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="rounded border border-zinc-700 bg-zinc-900/70 p-3">
            <p className="mb-2 text-sm text-zinc-200">
              Editing node: <span className="font-semibold">{displayName(selectedNode)}</span>
            </p>

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <select
                value={selectedForm.relatedMemberId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    [selectedNodeId]: {
                      ...selectedForm,
                      relatedMemberId: e.target.value,
                    },
                  }))
                }
                className="rounded border px-2 py-1.5"
              >
                <option value="">Select member to link</option>
                {members
                  .filter((m) => m.id !== selectedNodeId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {displayName(m)}
                    </option>
                  ))}
              </select>

              <select
                value={selectedForm.relationType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    [selectedNodeId]: {
                      ...selectedForm,
                      relationType: e.target.value,
                    },
                  }))
                }
                className="rounded border px-2 py-1.5"
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!selectedNodeId || !selectedForm.relatedMemberId}
                onClick={() =>
                  onAddFromTree(
                    selectedNodeId,
                    Number(selectedForm.relatedMemberId),
                    selectedForm.relationType
                  )
                }
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add Link
              </button>
            </div>

            <div className="space-y-1">
              {selectedLinks.length === 0 ? (
                <p className="text-xs text-zinc-400">No direct links for this node.</p>
              ) : (
                selectedLinks.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
                  >
                    <div className="text-xs">
                      <span className="capitalize">{rel.relationType}</span>
                      <span className="text-zinc-400">{" -> "}</span>
                      <span>{displayName(rel.relatedMember)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveFromTree(selectedNodeId, rel.id)}
                      className="rounded border border-red-800 px-2 py-0.5 text-xs text-red-300 hover:bg-red-900/30"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RelationshipsManager({ member, members, onClose }) {
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRelatedId, setSelectedRelatedId] = useState("");
  const [relationType, setRelationType] = useState("spouse");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFamilyTree, setShowFamilyTree] = useState(false);

  const loadRelationships = useCallback(async () => {
    if (!member?.id) return;
    setLoading(true);
    setError("");
    try {
      const rows = await MembersApi.listRelationships(member.id);
      setRelationships(rows);
    } catch (err) {
      setError(err?.message || "Failed to load relationships");
    } finally {
      setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const candidateMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (m.id === member.id) return false;
      if (!q) return true;
      return displayName(m).toLowerCase().includes(q);
    });
  }, [member.id, members, search]);

  const topMatches = useMemo(() => candidateMembers.slice(0, 8), [candidateMembers]);

  async function onAddRelationship() {
    if (!selectedRelatedId || !relationType) return;
    setSaving(true);
    setError("");
    try {
      await MembersApi.addRelationship(member.id, {
        relatedMemberId: Number(selectedRelatedId),
        relationType,
        reciprocal: true,
      });
      setSelectedRelatedId("");
      await loadRelationships();
    } catch (err) {
      setError(err?.message || "Failed to add relationship");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteRelationship(relationshipId) {
    setError("");
    try {
      await MembersApi.removeRelationship(member.id, relationshipId);
      await loadRelationships();
    } catch (err) {
      setError(err?.message || "Failed to remove relationship");
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            Relationships: {displayName(member)}
          </h3>
          <p className="text-sm text-zinc-400">
            Link this member to family members in your directory.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Close
        </button>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowFamilyTree((v) => !v)}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          {showFamilyTree ? "Hide Family Tree" : "Generate Family Tree"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search related member..."
            className="w-full px-3 py-2 border rounded"
          />
          {search.trim() && (
            <div className="absolute z-20 mt-2 max-h-40 w-full overflow-auto rounded border border-zinc-700 bg-zinc-950 shadow-lg">
              {topMatches.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-400">No matches</p>
              ) : (
                topMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedRelatedId(String(m.id))}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                      String(selectedRelatedId) === String(m.id) ? "bg-zinc-800" : ""
                    }`}
                  >
                    {displayName(m)}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <select
          value={selectedRelatedId}
          onChange={(e) => setSelectedRelatedId(e.target.value)}
          className="px-3 py-2 border rounded md:col-span-2"
        >
          <option value="">Select related member</option>
          {candidateMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {displayName(m)}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            {RELATION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddRelationship}
            disabled={saving || !selectedRelatedId}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading relationships...</p>
      ) : relationships.length === 0 ? (
        <p className="text-sm text-zinc-400">No relationships added yet.</p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900 p-2"
            >
              <div className="text-sm">
                <span className="font-medium capitalize">{rel.relationType}</span>
                <span className="text-zinc-400">{" -> "}</span>
                <span>{displayName(rel.relatedMember)}</span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteRelationship(rel.id)}
                className="rounded border border-red-800 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {showFamilyTree && (
        <FamilyTreeEditor
          member={member}
          members={members}
          onRootRelationshipsUpdated={loadRelationships}
        />
      )}
    </div>
  );
}
