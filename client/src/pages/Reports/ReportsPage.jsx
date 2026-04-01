import { useMemo, useState } from "react";
import MemberDirectory from "./MemberDirectory/MemberDirectory";
import AttendanceReport from "./AttendanceReport/AttendanceReport";
import AgeGroupCards from "./Stats/AgeGroupCards";
import QuarterlySummaryTable from "./Stats/QuarterlySummaryTable";
import MonthlySummaryTable from "./Stats/MonthlySummaryTable";
import MemberFrequencyTable from "./Stats/MemberFrequencyTable";
import { calculateAge, getAgeGroup } from "../../utils/dateUtils";
import { downloadCsv } from "../../utils/csv";

import {
  buildMemberFrequency,
  buildMonthlyReports,
  buildQuarterlyReports,
  buildReportsByAge,
  filterAttendance,
} from "../../utils/reportUtils";

export default function ReportsPage({ members, events, attendance }) {
  // Directory filters
  const [directoryFilters, setDirectoryFilters] = useState({
    firstName: "all",
    lastName: "all",
    street: "all",
    city: "all",
    state: "all",
    zip: "all",
  });

  // Attendance report filters
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reportsByAge = useMemo(
    () => buildReportsByAge(members, attendance),
    [members, attendance]
  );

  const monthlyReports = useMemo(
    () => buildMonthlyReports(attendance, events),
    [attendance, events]
  );

  const quarterlyReports = useMemo(
    () => buildQuarterlyReports(members, attendance, events),
    [members, attendance, events]
  );

  const memberFrequency = useMemo(
    () => buildMemberFrequency(members, attendance),
    [members, attendance]
  );

  const filteredAttendance = useMemo(
    () =>
      filterAttendance({
        attendance,
        members,
        selectedEventFilter,
        dateFilterType,
        singleDate,
        startDate,
        endDate,
        ageFilter,
      }),
    [
      attendance,
      members,
      selectedEventFilter,
      dateFilterType,
      singleDate,
      startDate,
      endDate,
      ageFilter,
    ]
  );

  const memberById = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member])),
    [members]
  );
  const eventById = useMemo(
    () => Object.fromEntries(events.map((event) => [event.id, event])),
    [events]
  );

  const attendanceExportRows = useMemo(
    () =>
      filteredAttendance.map((record) => {
        const member = memberById[record.memberId];
        const event = eventById[record.eventId];
        const age = member?.birthDate ? calculateAge(member.birthDate) : "N/A";
        return {
          eventName: event?.name || "",
          eventType: event?.type || "",
          eventDate: event?.date || "",
          memberName: member?.name || "",
          memberEmail: member?.email || "",
          memberPhone: member?.phone || "",
          age,
          ageGroup: age !== "N/A" ? getAgeGroup(age) : "N/A",
          attendanceDate: record.date || "",
        };
      }),
    [filteredAttendance, memberById, eventById]
  );

  const ageGroupExportRows = useMemo(
    () =>
      Object.entries(reportsByAge).map(([group, data]) => ({
        ageGroup: group,
        members: data.count,
        totalAttendance: data.totalAttendance,
        avgPerMember: data.count > 0 ? (data.totalAttendance / data.count).toFixed(1) : "0.0",
      })),
    [reportsByAge]
  );

  const monthlyExportRows = useMemo(
    () =>
      monthlyReports.map((row) => ({
        month: row.month,
        totalAttendance: row.totalAttendance,
        uniqueAttendees: row.uniqueAttendees,
        avgPerEvent: row.avgPerEvent,
      })),
    [monthlyReports]
  );

  const quarterlyExportRows = useMemo(
    () =>
      quarterlyReports.map((row) => ({
        quarter: row.quarterLabel,
        newMembers: row.newMembers,
        totalMembers: row.totalMembers,
        eventsHeld: row.eventsHeld,
        totalAttendance: row.totalAttendance,
        uniqueAttendees: row.uniqueAttendees,
        avgAttendancePerEvent: row.avgAttendancePerEvent,
        memberParticipationRate: row.memberParticipationRate,
      })),
    [quarterlyReports]
  );

  const memberFrequencyExportRows = useMemo(
    () =>
      memberFrequency.map((member) => ({
        name: member.name || "",
        age: calculateAge(member.birthDate),
        attendanceCount: member.attendanceCount,
        status:
          member.attendanceCount === 0
            ? "Inactive"
            : member.attendanceCount < 3
              ? "Occasional"
              : "Regular",
      })),
    [memberFrequency]
  );

  return (
    <div className="space-y-8">
      <MemberDirectory
        members={members}
        filters={directoryFilters}
        setFilters={setDirectoryFilters}
      />

      <AttendanceReport
        members={members}
        events={events}
        attendance={attendance}
        filteredAttendance={filteredAttendance}
        selectedEventFilter={selectedEventFilter}
        setSelectedEventFilter={setSelectedEventFilter}
        ageFilter={ageFilter}
        setAgeFilter={setAgeFilter}
        dateFilterType={dateFilterType}
        setDateFilterType={setDateFilterType}
        singleDate={singleDate}
        setSingleDate={setSingleDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "attendance-report.csv",
              [
                { key: "eventName", label: "Event Name" },
                { key: "eventType", label: "Event Type" },
                { key: "eventDate", label: "Event Date" },
                { key: "memberName", label: "Member Name" },
                { key: "memberEmail", label: "Member Email" },
                { key: "memberPhone", label: "Member Phone" },
                { key: "age", label: "Age" },
                { key: "ageGroup", label: "Age Group" },
                { key: "attendanceDate", label: "Attendance Date" },
              ],
              attendanceExportRows
            )
          }
        >
          Export Attendance Report CSV
        </button>
      </div>

      <AgeGroupCards reportsByAge={reportsByAge} />

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "attendance-by-age-group.csv",
              [
                { key: "ageGroup", label: "Age Group" },
                { key: "members", label: "Members" },
                { key: "totalAttendance", label: "Total Attendance" },
                { key: "avgPerMember", label: "Avg per Member" },
              ],
              ageGroupExportRows
            )
          }
        >
          Export Age Group CSV
        </button>
      </div>

      <QuarterlySummaryTable quarterlyReports={quarterlyReports} />

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "quarterly-membership-attendance.csv",
              [
                { key: "quarter", label: "Quarter" },
                { key: "newMembers", label: "New Members" },
                { key: "totalMembers", label: "Total Members" },
                { key: "eventsHeld", label: "Events Held" },
                { key: "totalAttendance", label: "Total Attendance" },
                { key: "uniqueAttendees", label: "Unique Attendees" },
                { key: "avgAttendancePerEvent", label: "Avg Attendance / Event" },
                { key: "memberParticipationRate", label: "Participation Rate" },
              ],
              quarterlyExportRows
            )
          }
        >
          Export Quarterly Report CSV
        </button>
      </div>

      <MonthlySummaryTable monthlyReports={monthlyReports} />

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "monthly-attendance-summary.csv",
              [
                { key: "month", label: "Month" },
                { key: "totalAttendance", label: "Total Attendance" },
                { key: "uniqueAttendees", label: "Unique Attendees" },
                { key: "avgPerEvent", label: "Avg per Event" },
              ],
              monthlyExportRows
            )
          }
        >
          Export Monthly Summary CSV
        </button>
      </div>

      <MemberFrequencyTable members={memberFrequency} />

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "member-attendance-frequency.csv",
              [
                { key: "name", label: "Member" },
                { key: "age", label: "Age" },
                { key: "attendanceCount", label: "Total Events Attended" },
                { key: "status", label: "Status" },
              ],
              memberFrequencyExportRows
            )
          }
        >
          Export Member Frequency CSV
        </button>
      </div>
    </div>
  );
}
