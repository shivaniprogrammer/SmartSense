// timetable-data.js: CSE II Year, III Sem, Section F (w.e.f. 06.07.2026), copied from the college timetable.
(function () {
  // [startHour, startMin, endHour, endMin] for periods 1-8
  const PER = [[8,15,9,5],[9,5,9,55],[10,10,11,0],[11,0,11,50],[11,50,12,40],[13,30,14,15],[14,15,15,0],[15,0,15,45]];
  const CRS = {
    DM: ["Discrete Mathematics", "Dr. Elayarani"],
    CN: ["Computer Networks", "Mrs. Maheswari"],
    ADSA: ["Advanced Data Structures and Algorithms", "SME"],
    FAIML: ["Fundamentals of AI and Machine Learning", "Ms. Adlin Jibisha"],
    ESD: ["Embedded System Design", "Dr. Kavitha"],
    OOPJ: ["Object Oriented Programming using Java", "Ms. Sushmitha"],
    CSD: ["Career Skill Development III", "Dr. J.S. Adeline Johnsana"],
    AT: ["Aptitude Test", "Ms. Ani Bernish T"],
    TT: ["Technical Test", "Ms. Adlin Jibisha"],
    NPTEL: ["NPTEL", "Ms. Sindhu S"],
    LC: ["Leet Code", "Ms. Sushmitha"],
    COUN: ["Counselling", "Ms. Swathi / Mrs. Ani Bernish"],
    "DM (T)": ["Discrete Mathematics (Tutorial)", "Dr. Elayarani"]
  };
  // Mon..Fri. Each slot: [code, firstPeriod, lastPeriod]
  const TT = [
    [["CN",1,1],["ESD",2,2],["ADSA",3,5],["DM",6,6],["OOPJ LAB",7,8]],
    [["AT",1,1],["CN",2,2],["FAIML",3,3],["DM",4,4],["COUN",5,5],["OOPJ",6,6],["ESD LAB",7,8]],
    [["FAIML",1,1],["ESD",2,2],["DM",3,3],["OOPJ LAB",4,5],["ADSA",6,6],["ADSA LAB",7,8]],
    [["TT",1,1],["CN",2,2],["FAIML",3,3],["CSD",4,5],["ESD",6,6],["DM (T)",7,7],["LC",8,8]],
    [["ESD",1,1],["CN",2,2],["OOPJ",3,3],["FAIML",4,4],["DM",5,5],["NPTEL",6,6],["FAIML LAB",7,8]]
  ];
  const f = (h, m) => (h > 12 ? h - 12 : h) + ":" + String(m).padStart(2, "0");
  window.SS = {
    PER, CRS, TT,
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    room: "LH1408",
    timeLabel: (a, b) => f(PER[a-1][0], PER[a-1][1]) + " – " + f(PER[b-1][2], PER[b-1][3]),
    startMin: (p) => PER[p-1][0] * 60 + PER[p-1][1],
    endMin: (p) => PER[p-1][2] * 60 + PER[p-1][3],
    info: function (code) {
      const lab = code.endsWith(" LAB"), key = lab ? code.slice(0, -4) : code, c = CRS[key] || [key, ""];
      return { lab, name: c[0] + (lab ? " Lab" : ""), faculty: lab ? "Lab session" : c[1] };
    }
  };
})();