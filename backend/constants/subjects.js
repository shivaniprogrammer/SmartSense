// Central list of subjects/faculty-assignable slots a teacher can pick from when
// setting up their faculty role, taken directly from the CSE department's
// timetable/course allotment sheet. Edit this array only if the actual
// curriculum changes.
//
// code  = short form used in the timetable grid and stored on the teacher's
//         account (facultySubjects) and on Timetable documents (subjectCode)
// title = full course/activity name shown in the UI
module.exports = [
  { code: "DM", title: "Discrete Mathematics" },
  { code: "CN", title: "Computer Networks" },
  { code: "ADSA", title: "Advanced Data Structures and Algorithms" },
  { code: "FAIML", title: "Fundamentals of Artificial Intelligence and Machine Learning" },
  { code: "ESD", title: "Embedded System Design" },
  { code: "OOPJ", title: "Object Oriented Programming using Java" },
  { code: "CSD", title: "Career Skill Development III" },
  { code: "AT", title: "Aptitude Test" },
  { code: "TT", title: "Technical Test" },
  { code: "NPTEL", title: "NPTEL" },
  { code: "LC", title: "Leet Code" },
  { code: "COUN", title: "Counselling" },
];