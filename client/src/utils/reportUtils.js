import { calculateAge, getAgeGroup } from "./dateUtils";

function parseDateParts(value) {
  if (!value) return null;

  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function monthKeyFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function quarterFromMonth(month) {
  return Math.floor((month - 1) / 3) + 1;
}

function quarterKeyFromParts(parts) {
  return `${parts.year}-Q${quarterFromMonth(parts.month)}`;
}

function quarterLabelFromKey(key) {
  const [year, quarter] = key.split("-Q");
  return `Q${quarter} ${year}`;
}

function quarterIndexFromParts(parts) {
  return parts.year * 4 + (quarterFromMonth(parts.month) - 1);
}

function quarterKeyFromIndex(index) {
  const year = Math.floor(index / 4);
  const quarter = (index % 4) + 1;
  return `${year}-Q${quarter}`;
}

function countItemsByKey(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    if (!key) return counts;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

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
  const eventCountsByMonth = countItemsByKey(events, (event) => {
    const parts = parseDateParts(event.date);
    return parts ? monthKeyFromParts(parts) : null;
  });
  const attendanceEventIdsByMonth = {};

  attendance.forEach((record) => {
    const parts = parseDateParts(record.date);
    if (!parts) return;

    const monthKey = monthKeyFromParts(parts);
    if (!months[monthKey]) months[monthKey] = { total: 0, uniqueMembers: new Set() };
    months[monthKey].total++;
    months[monthKey].uniqueMembers.add(record.memberId);

    if (record.eventId != null) {
      if (!attendanceEventIdsByMonth[monthKey]) {
        attendanceEventIdsByMonth[monthKey] = new Set();
      }
      attendanceEventIdsByMonth[monthKey].add(record.eventId);
    }
  });

  return Object.entries(months)
    .map(([month, data]) => ({
      month,
      totalAttendance: data.total,
      uniqueAttendees: data.uniqueMembers.size,
      avgPerEvent: (
        data.total /
        Math.max(eventCountsByMonth[month] || 0, attendanceEventIdsByMonth[month]?.size || 0, 1)
      ).toFixed(1),
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

function getMemberStartDate(member) {
  return member.membershipDate || member.joinDate || member.createdAt || null;
}

export function buildQuarterlyReports(members, attendance, events) {
  const memberQuarterIndexes = [];
  const newMembersByQuarter = {};
  const allQuarterIndexes = [];

  members.forEach((member) => {
    const parts = parseDateParts(getMemberStartDate(member));
    if (!parts) return;

    const quarterIndex = quarterIndexFromParts(parts);
    const quarterKey = quarterKeyFromIndex(quarterIndex);
    memberQuarterIndexes.push(quarterIndex);
    newMembersByQuarter[quarterKey] = (newMembersByQuarter[quarterKey] || 0) + 1;
    allQuarterIndexes.push(quarterIndex);
  });

  const quarterlyAttendance = {};
  const attendanceEventIdsByQuarter = {};
  attendance.forEach((record) => {
    const parts = parseDateParts(record.date);
    if (!parts) return;

    const quarterIndex = quarterIndexFromParts(parts);
    const quarterKey = quarterKeyFromIndex(quarterIndex);
    allQuarterIndexes.push(quarterIndex);

    if (!quarterlyAttendance[quarterKey]) {
      quarterlyAttendance[quarterKey] = { totalAttendance: 0, uniqueMembers: new Set() };
    }

    quarterlyAttendance[quarterKey].totalAttendance++;
    quarterlyAttendance[quarterKey].uniqueMembers.add(record.memberId);

    if (record.eventId != null) {
      if (!attendanceEventIdsByQuarter[quarterKey]) {
        attendanceEventIdsByQuarter[quarterKey] = new Set();
      }
      attendanceEventIdsByQuarter[quarterKey].add(record.eventId);
    }
  });

  const eventCountsByQuarter = countItemsByKey(events, (event) => {
    const parts = parseDateParts(event.date);
    if (!parts) return null;

    const quarterIndex = quarterIndexFromParts(parts);
    allQuarterIndexes.push(quarterIndex);
    return quarterKeyFromParts(parts);
  });

  if (allQuarterIndexes.length === 0) return [];

  memberQuarterIndexes.sort((a, b) => a - b);
  const minQuarter = Math.min(...allQuarterIndexes);
  const maxQuarter = Math.max(...allQuarterIndexes);

  const rows = [];
  let memberCursor = 0;

  for (let quarterIndex = minQuarter; quarterIndex <= maxQuarter; quarterIndex += 1) {
    const quarterKey = quarterKeyFromIndex(quarterIndex);

    while (
      memberCursor < memberQuarterIndexes.length &&
      memberQuarterIndexes[memberCursor] <= quarterIndex
    ) {
      memberCursor += 1;
    }

    const attendanceSummary = quarterlyAttendance[quarterKey];
    const eventsHeld = Math.max(
      eventCountsByQuarter[quarterKey] || 0,
      attendanceEventIdsByQuarter[quarterKey]?.size || 0
    );
    const totalAttendance = attendanceSummary?.totalAttendance || 0;
    const totalMembers = memberCursor;

    rows.push({
      quarter: quarterKey,
      quarterLabel: quarterLabelFromKey(quarterKey),
      newMembers: newMembersByQuarter[quarterKey] || 0,
      totalMembers,
      eventsHeld,
      totalAttendance,
      uniqueAttendees: attendanceSummary?.uniqueMembers.size || 0,
      avgAttendancePerEvent: eventsHeld > 0 ? (totalAttendance / eventsHeld).toFixed(1) : "0.0",
      memberParticipationRate:
        totalMembers > 0
          ? `${((attendanceSummary?.uniqueMembers.size || 0) / totalMembers * 100).toFixed(1)}%`
          : "0.0%",
    });
  }

  return rows.sort((a, b) => b.quarter.localeCompare(a.quarter));
}
