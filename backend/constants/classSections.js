// Master list of every class/section in the college. Every other part of the app
// (admin assignment tool, timetable seeding/creation, dropdowns) reads from this
// single list — to add a new class later, just add it here, nothing else needs
// to change.
//
// Format: { code: "internal value stored in the DB", label: "shown in the UI" }
module.exports = [
  { code: "CSE A", label: "CSE A" },
  { code: "CSE B", label: "CSE B" },
  { code: "CSE C", label: "CSE C" },
  { code: "CSE F", label: "CSE F" },
  { code: "ECE A", label: "ECE A" },
  { code: "IT A", label: "IT A" },
  { code: "EEE A", label: "EEE A" },
];