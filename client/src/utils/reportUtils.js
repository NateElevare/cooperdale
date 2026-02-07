import { calculateAge, getAgeGroup } from "./dateUtils";

export function getUniqueValues(members, field) {
  const values = members.map((m) => m[field]).filter((v) => v && String(v).trim() !== "");
  return [...new Set(values)].sort();
}

export function filterMembers(members, filters) {
  return members.filter((m) => {
    if (filters.firstName !== "all" && m.firstName !== filters.firstName) return false;
    if (filters.lastName !== "all" && m.lastName !== filters.lastName) return false;
    if (filters.street !== "all" && m.street !== filters.street) return false;
    if (filters.city !== "all" && m.city !== filters.city) return false;
    if (filters.state !== "all" && m.state !== filters.state) return false;
    if (filters.zip !== "all" && m.zip !== filters.zip) return false;
    return true;
  });
}

export function filterAttendance({
  attendance,
  members,
  selectedEventFilter,
  dateFilterType,
  singleDate,
  startDate,
  endDate,
  ageFilter,
}) {
  return attendance.filter((record) => {
    // Event filter
    if (selectedEventFilter !== "all" && record.eventId !== Number(selectedEventFilter)) {
      return false;
    }

    // Date filter
    if (dateFilterType === "single" && singleDate) {
      if (record.date !== singleDate) return false;
    } else if (dateFilterType === "range" && startDate && endDate) {
      if (record.date < startDate || record.date > endDate) return false;
    }

    // Age filter
    if (ageFilter !== "all") {
      const member = members.find((m) => m.id === record.memberId);
      if (!member?.birthDate) return false;
      const age = calculateAge(member.birthDate);
      if (age === "N/A") return false;
      const group = getAgeGroup(age);
      if (group !== ageFilter) return false;
    }

    return true;
  });
}

export function buildReportsByAge(members, attendance) {
  const ageGroups = {};
  members.forEach((member) => {
    if (!member.birthDate) return;
    const age = calculateAge(member.birthDate);
    if (age === "N/A") return;

    const group = getAgeGroup(age);
    if (!ageGroups[group]) ageGroups[group] = { count: 0, totalAttendance: 0 };

    ageGroups[group].count++;
    ageGroups[group].totalAttendance += attendance.filter((a) => a.memberId === member.id).length;
  });
  return ageGroups;
}

export function buildMonthlyReports(attendance, events) {
  const months = {};
  attendance.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months[monthKey]) months[monthKey] = { total: 0, uniqueMembers: new Set() };
    months[monthKey].total++;
    months[monthKey].uniqueMembers.add(record.memberId);
  });

  return Object.entries(months)
    .map(([month, data]) => ({
      month,
      totalAttendance: data.total,
      uniqueAttendees: data.uniqueMembers.size,
      avgPerEvent: events.length > 0 ? (data.total / events.length).toFixed(1) : "0",
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function buildMemberFrequency(members, attendance) {
  return members
    .map((member) => {
      const count = attendance.filter((a) => a.memberId === member.id).length;
      return { ...member, attendanceCount: count };
    })
    .sort((a, b) => b.attendanceCount - a.attendanceCount);
}
