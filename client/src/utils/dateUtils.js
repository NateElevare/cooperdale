export function calculateAge(birthDate) {
  if (!birthDate) return "N/A";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getAgeGroup(age) {
  if (age < 13) return "Children (0-12)";
  if (age < 18) return "Youth (13-17)";
  if (age < 35) return "Young Adults (18-34)";
  if (age < 65) return "Adults (35-64)";
  return "Seniors (65+)";
}
