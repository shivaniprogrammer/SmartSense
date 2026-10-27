// teacher-sample.js: class list + SAMPLE attendance for the teacher pages (dashboard, reports, students).
// The student names and register numbers are the real CSE F class list. The attendance numbers are demo values,
// because BLE is only enrolled for a few students right now.
// When real data is ready, set DEMO to false below and the pages switch to the real server endpoints.
(function () {
  const NAMES = [
    "Santhosh M", "Santhosh Narayan", "Saranraj J", "S Saravana Kumar", "Saravanan S", "Sarika G", "Sarvendra J", "Sarveshaa B D",
    "Sathish Manikandan", "Sathiya Priya C", "Sathya Prasanna R", "Satindra R", "Saveetha J", "Sevitha A", "Shahana K", "Shakthyvel S",
    "T Shalini", "Shameer S", "Shamithra S", "Shanmuga Priya A", "Sharan M", "Sharukhkhan B", "Shaun Jeffery P", "Sherline P",
    "Shikha Kumari", "Shiva Prasaadh R", "S Shivani", "Shivani S", "S Shivani Shree", "Shree Sai Lakshmi", "Shree Sudharsan R P", "J Shreehari",
    "S Shreya", "Shreya Sivanath", "Shreyan Arunlal", "Shri Bala Vignesh A", "K Shriarjun", "Shriram S", "Shrriyas A", "S Shruthi",
    "R Shruti", "Shruti Roy", "A Shyamganesh", "Sivadharsan R S", "Snowin Karl Shelton", "Sonali S", "Sree Vaibavi V", "Sreeja Ramanathan",
    "Sreekar Karthik VI", "Sreeram R", "Sri Abinandhan S", "Sri Sudhiksha J", "Srikesh HS", "M Srilaja", "Srinidi R", "Sri Raam S K",
    "B Sriraghav", "Srivari R", "Srivatsan R", "V Sruthika", "Suchith Kumar V S", "Sudarsanan K", "H Sujita", "Sunilkumar R",
    "Nirmalkumar S", "Santhosh Kumar S", "Nithesh K", "Sirish Kumar S"
  ];
  // CSE325 to CSE388 run in order, then the four lateral-entry numbers CSE2026064 to CSE2026067
  const STUDENTS = NAMES.map((n, i) => ({ name: n, studentId: "CSE" + (i < 64 ? 325 + i : 2026064 + (i - 64)) }));
  const N = STUDENTS.length;                               // 68

  const hash = (s) => { let x = 7; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x % 100; };
  const stOf = (v) => (v < 80 ? "present" : v < 88 ? "late" : "absent");

  window.TS = {
    DEMO: true,                                            // <-- the one switch
    N: N,
    students: STUDENTS,
    // one period of one class on one date (deterministic, so numbers don't change on refresh)
    records: function (section, code, day, startMin) {
      const key = section + "|" + code + "|" + day + "|" + startMin, base = new Date(day + "T00:00:00");
      return STUDENTS.map((st, i) => {
        const v = hash(i + "|" + key), s = stOf(v); let t = null;
        if (s !== "absent") { t = new Date(base); t.setMinutes(startMin + (s === "late" ? 10 + (v % 15) : v % 5)); }
        return { student: { name: st.name, studentId: st.studentId }, checkInTime: t, status: s };
      });
    },
    // whole-day totals for one date
    day: function (day) {
      let p = 0, l = 0, a = 0;
      for (let i = 0; i < N; i++) { const s = stOf(hash(i + "|D|" + day)); if (s === "present") p++; else if (s === "late") l++; else a++; }
      return { total: N, present: p, late: l, absent: a };
    },
    // per-student totals (45 sample class days, some below 75%) plus today's status, for the Students page
    summary: function (day) {
      return STUDENTS.map((st, i) => { const ab = Math.floor(hash(i + "|abs") * 0.135); return { name: st.name, studentId: st.studentId, present: 45 - ab, absent: ab, today: stOf(hash(i + "|D|" + day)) }; });
    }
  };
})();