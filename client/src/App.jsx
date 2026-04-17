import { useCallback, useEffect, useMemo, useState } from "react";
import Tabs from "./components/Tabs";
import LoadingScreen from "./components/LoadingScreen";

import { MembersApi } from "./api/members";
import { EventsApi } from "./api/events";
import { AttendanceApi } from "./api/attendance";
import { AuthApi } from "./api/auth";
import { FollowupsApi } from "./api/followups";
import { HttpError, setAuthToken, getAuthToken } from "./api/http";

import MembersPage from "./pages/Members/MembersPage";
import EventsPage from "./pages/Events/EventsPage";
import AttendancePage from "./pages/Attendance/AttendancePage";
import ReportsPage from "./pages/Reports/ReportsPage";
import LoginPage from "./pages/Auth/LoginPage";
import UsersPage from "./pages/Users/UsersPage";
import MessagesPage from "./pages/Messages/MessagesPage";
import FollowUpPage from "./pages/FollowUp/FollowUpPage";

export default function App() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [followups, setFollowups] = useState([]);

  const [activeTab, setActiveTab] = useState("members");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");

  const logout = useCallback(() => {
    setAuthToken("");
    setCurrentUser(null);
    setMembers([]);
    setEvents([]);
    setAttendance([]);
    setFollowups([]);
    setActiveTab("members");
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [m, e, a, f] = await Promise.all([
        MembersApi.list(),
        EventsApi.list(),
        AttendanceApi.list(),
        FollowupsApi.list(),
      ]);
      setMembers(m);
      setEvents(e);
      setAttendance(a);
      setFollowups(f);
    } catch (err) {
      console.error(err);
      if (err instanceof HttpError && err.status === 401) {
        logout();
        setLoginError("Your session expired. Please sign in again.");
      } else {
        alert("Error connecting to server.");
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = getAuthToken();
        if (!token) return;
        const me = await AuthApi.me();
        setCurrentUser(me);
        await fetchAll();
      } catch {
        setAuthToken("");
        setCurrentUser(null);
      } finally {
        setBooting(false);
      }
    }

    bootstrap();
  }, [fetchAll]);

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "members", label: "Attendees" },
      { id: "events", label: "Events" },
      { id: "attendance", label: "Attendance" },
      { id: "followup", label: "Follow Up" },
      { id: "messages", label: "Messages" },
      { id: "reports", label: "Reports" },
    ];

    if (currentUser?.role === "admin") {
      return [...baseTabs, { id: "users", label: "Users" }];
    }
    return baseTabs;
  }, [currentUser]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("members");
    }
  }, [tabs, activeTab]);

  const actions = useMemo(() => {
    return {
      addMember: async (member) => {
        await MembersApi.create(member);
        await fetchAll();
      },
      updateMember: async (id, member) => {
        await MembersApi.update(id, member);
        await fetchAll();
      },
      deleteMember: async (id) => {
        await MembersApi.remove(id);
        await fetchAll();
      },
      addEvent: async (event) => {
        await EventsApi.create(event);
        await fetchAll();
      },
      deleteEvent: async (id) => {
        await EventsApi.remove(id);
        await fetchAll();
      },
      addAttendance: async (rec) => {
        await AttendanceApi.create(rec);
        await fetchAll();
      },
      addAttendanceBulk: async (records) => {
        let created = 0;
        let duplicates = 0;
        let failed = 0;

        for (const rec of records) {
          try {
            await AttendanceApi.create(rec);
            created += 1;
          } catch (err) {
            const message = String(err?.message || "");
            if (message.includes("already exists") || message.includes("409")) {
              duplicates += 1;
            } else {
              failed += 1;
            }
          }
        }

        await fetchAll();
        return { total: records.length, created, duplicates, failed };
      },
      deleteAttendance: async (id) => {
        await AttendanceApi.remove(id);
        await fetchAll();
      },
      addFollowup: async (data) => {
        await FollowupsApi.create(data);
        await fetchAll();
      },
      deleteFollowup: async (id) => {
        await FollowupsApi.remove(id);
        await fetchAll();
      },
    };
  }, [fetchAll]);

  const handleLogin = async (username, password) => {
    try {
      setLoginError("");
      const result = await AuthApi.login(username, password);
      setAuthToken(result.token);
      setCurrentUser(result.user);
      await fetchAll();
    } catch (e) {
      setLoginError(e.message || "Login failed");
    }
  };

  if (booting) return <LoadingScreen />;
  if (!currentUser) return <LoginPage onLogin={handleLogin} error={loginError} />;
  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/70 bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Church Attendance Tracker
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Manage members, events, and track attendance
              </p>
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-xs rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
                {currentUser.displayName} ({currentUser.role})
              </span>
              <button
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/60 p-1">
              <Tabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-xl">
          <div className="p-5 sm:p-6">
            {activeTab === "members" && (
              <MembersPage members={members} actions={actions} attendance={attendance} events={events} />
            )}
            {activeTab === "events" && (
              <EventsPage events={events} actions={actions} />
            )}
            {activeTab === "attendance" && (
              <AttendancePage
                members={members}
                events={events}
                attendance={attendance}
                actions={actions}
              />
            )}
            {activeTab === "reports" && (
              <ReportsPage
                members={members}
                events={events}
                attendance={attendance}
              />
            )}
            {activeTab === "followup" && (
              <FollowUpPage
                members={members}
                attendance={attendance}
                followups={followups}
                actions={actions}
                currentUser={currentUser}
              />
            )}
            {activeTab === "messages" && (
              <MessagesPage currentUser={currentUser} />
            )}
            {activeTab === "users" && currentUser.role === "admin" && (
              <UsersPage currentUser={currentUser} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
