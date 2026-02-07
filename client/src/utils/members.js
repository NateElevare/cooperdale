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
export function calculateAge(birthDate) {
  if (!birthDate) return "N/A";

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function getAgeGroup(age) {
  if (age === "N/A") return "N/A";
  if (age < 13) return "Children (0-12)";
  if (age < 18) return "Youth (13-17)";
  if (age < 35) return "Young Adults (18-34)";
  if (age < 65) return "Adults (35-64)";
  return "Seniors (65+)";
}