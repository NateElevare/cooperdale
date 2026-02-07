import { useMemo, useState } from "react";
import MemberDirectory from "./MemberDirectory/MemberDirectory";
import AttendanceReport from "./AttendanceReport/AttendanceReport";
import AgeGroupCards from "./Stats/AgeGroupCards";
import MonthlySummaryTable from "./Stats/MonthlySummaryTable";
import MemberFrequencyTable from "./Stats/MemberFrequencyTable";
import { calculateAge, getAgeGroup } from "../../utils/dateUtils";
import { downloadCsv } from "../../utils/csv";

import {
  buildMemberFrequency,
  buildMonthlyReports,
  buildReportsByAge,
  filterAttendance,
  filterMembers,
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

  const memberFrequency = useMemo(
    () => buildMemberFrequency(members, attendance),
    [members, attendance]
  );

  const filteredDirectoryMembers = useMemo(
    () => filterMembers(members, directoryFilters),
    [members, directoryFilters]
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

  const directoryExportRows = useMemo(
    () =>
      filteredDirectoryMembers.map((member) => ({
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
    [filteredDirectoryMembers]
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
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
          onClick={() =>
            downloadCsv(
              "member-directory.csv",
              [
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
              ],
              directoryExportRows
            )
          }
        >
          Export Member Directory CSV
        </button>
      </div>

      <MemberDirectory
        members={members}
        filters={directoryFilters}
        setFilters={setDirectoryFilters}
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

      <AgeGroupCards reportsByAge={reportsByAge} />

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

      <MonthlySummaryTable monthlyReports={monthlyReports} />

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

      <MemberFrequencyTable members={memberFrequency} />
    </div>
  );
}
