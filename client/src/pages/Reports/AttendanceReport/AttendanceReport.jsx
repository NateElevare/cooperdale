import { useMemo } from "react";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceSummary from "./AttendanceSummary";
import AttendanceByEventList from "./AttendanceByEventList";
import { filterAttendance } from "../../../utils/reportUtils";

export default function AttendanceReport(props) {
  const filteredAttendance = useMemo(() => {
    if (Array.isArray(props.filteredAttendance)) {
      return props.filteredAttendance;
    }

    return filterAttendance({
      attendance: props.attendance,
      members: props.members,
      selectedEventFilter: props.selectedEventFilter,
      dateFilterType: props.dateFilterType,
      singleDate: props.singleDate,
      startDate: props.startDate,
      endDate: props.endDate,
      ageFilter: props.ageFilter,
    });
  }, [
    props.filteredAttendance,
    props.attendance,
    props.members,
    props.selectedEventFilter,
    props.dateFilterType,
    props.singleDate,
    props.startDate,
    props.endDate,
    props.ageFilter,
  ]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Attendance by Event - Filtered Report
      </h2>

      <AttendanceFilters {...props} />

      <AttendanceSummary
        filteredAttendance={filteredAttendance}
        eventsCount={props.selectedEventFilter === "all" ? props.events.length : 1}
        ageFilter={props.ageFilter}
      />

      <AttendanceByEventList
        filteredAttendance={filteredAttendance}
        members={props.members}
        events={props.events}
        selectedEventFilter={props.selectedEventFilter}
        ageFilter={props.ageFilter}
      />
    </div>
  );
}
