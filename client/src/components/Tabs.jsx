export default function Tabs({ activeTab, setActiveTab, tabs }) {
  const tabList = tabs || [
    { id: "members", label: "Members" },
    { id: "events", label: "Events" },
    { id: "attendance", label: "Attendance" },
    { id: "messages", label: "Messages" },
    { id: "reports", label: "Reports" },
  ];

  return (
    <nav className="flex flex-wrap gap-1">
      {tabList.map((t) => {
        const active = activeTab === t.id;

        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition",
              "focus:outline-none focus:ring-2 focus:ring-white/20",
              active
                ? "bg-zinc-100 text-zinc-900 shadow"
                : "text-zinc-200 hover:bg-zinc-800/70",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
