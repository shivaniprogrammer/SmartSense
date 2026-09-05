const API_BASE = "/api";
const SPRING_API_BASE = "http://localhost:8080";
const LOW_ATTENDANCE_THRESHOLD = 75;
const token = localStorage.getItem("token");
const storedUser = localStorage.getItem("user");

/*
  Derives the college register number from a studentId like "CSE352".
  Rule (from the class register format): fixed 9-digit prefix for this
  batch/department + the student ID's trailing 3 digits.
    CSE352 -> "310625104" + "352" -> "310625104352"

  If the studentId doesn't end in exactly 3 digits (e.g. lateral-entry
  IDs like "CSE2026064"), there's no known mapping, so this returns null
  and the caller should fall back to a stored register number instead.
*/
const REGISTER_NUMBER_PREFIX = "310625104";

function studentIdToRegisterNumber(studentId) {
    if (!studentId) return null;
    const match = String(studentId).match(/(\d{3})$/);
    if (!match) return null;
    return REGISTER_NUMBER_PREFIX + match[1];
}

function renderRegisterNumber(profile) {
    const regNoEl = document.getElementById("studentRegNo");
    if (!regNoEl || !profile) return;

    const regNo = profile.registerNumber || studentIdToRegisterNumber(profile.studentId);
    regNoEl.textContent = regNo ? "Reg No: " + regNo : "";
}

/*
  MOCK for now — swap todaysAttendanceStatus with a real value
  once you fetch the student's actual attendance record for today.
*/function renderTodayCard(profile, records) {
    const today = new Date();

    const dateString = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    document.getElementById("todayDate").textContent = dateString;

    const badge = document.getElementById("todayStatusBadge");
    const statusText = document.getElementById("todayStatusText");

    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
        badge.classList.remove("present", "absent");
        badge.classList.add("holiday");
        statusText.textContent = "Holiday";
        return;
    }

    badge.classList.remove("present", "absent", "holiday");

    const studentAttendance = records.find(function (record) {
        return String(record.student) === String(profile._id);
    });

    if (studentAttendance) {
        badge.classList.add("present");
        statusText.textContent = "Present";
    } else {
        badge.classList.add("absent");
        statusText.textContent = "Absent";
    }
}
// Auth guard - redirect to login if no token
if (!token) {
    window.location.href = "login-student.html";
}

// Add this near the other modal listeners (after the applyBtn.addEventListener block)

const leaveOdNavBtn = document.getElementById("leaveOdNavBtn");
if (leaveOdNavBtn) {
    leaveOdNavBtn.addEventListener("click", function () {
        applyModal.classList.add("show");
    });
}

let user = storedUser ? JSON.parse(storedUser) : null;

const studentNameEl = document.getElementById("studentName");
const profileNameEl = document.getElementById("profileName");
const avatarInitialEl = document.getElementById("avatarInitial");

if (user && user.name) {
    const firstName = user.name.split(" ")[0];
    studentNameEl.textContent = firstName;
    profileNameEl.textContent = firstName;
    avatarInitialEl.textContent = user.name.charAt(0).toUpperCase();
    renderRegisterNumber(user);
}


function authFetch(path, options = {}) {
    return fetch(API_BASE + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            ...(options.headers || {})
        }
    }).then(res => {
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login-student.html";
            return Promise.reject(new Error("Unauthorized"));
        }
        return res.json().then(data => ({ status: res.status, data }));
    });
}

function renderRequests(requests) {
    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    if (!requests.length) {
        activityList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No requests yet.</p>';
        return;
    }

    const statusIcon = { pending: "fa-hourglass-half", approved: "fa-check", rejected: "fa-xmark" };
    const statusClass = { pending: "notification", approved: "attendance", rejected: "notification" };

    requests.forEach(function (r) {
        const row = document.createElement("div");
        row.className = "activity-item";
        row.innerHTML = `
            <div class="activity-icon ${statusClass[r.status]}"><i class="fa-solid ${statusIcon[r.status]}"></i></div>
            <div>
                <h5>${r.type === "od" ? "On Duty" : "Leave"} request (${r.status})</h5>
                <p>${r.fromDate} to ${r.toDate} — ${r.reason}</p>
            </div>
        `;
        activityList.appendChild(row);
    });
}

// Load profile first (needed for name + attendance history lookup)
const profileLoaded = authFetch("/students/me")
    .then(function ({ data: profile }) {
        user = profile;
        localStorage.setItem("user", JSON.stringify(profile));

        if (profile.name) {
            const firstName = profile.name.split(" ")[0];
            studentNameEl.textContent = firstName;
            profileNameEl.textContent = firstName;
            avatarInitialEl.textContent = profile.name.charAt(0).toUpperCase();
        }
        renderRegisterNumber(profile);

        return profile;
    })
    .catch(function (err) {
        console.error("Failed to load profile:", err);
        return null;
    });
    // Load today's attendance from Spring Boot
function loadTodayAttendance() {
    return fetch(SPRING_API_BASE + "/attendance/today")
        .then(function (res) {
            return res.json();
        })
        .then(function (records) {
            console.log("Today's attendance from Spring Boot:", records);
            return records;
        })
        .catch(function (err) {
            console.error("Failed to load today's attendance:", err);
            return [];
        });
}
Promise.all([
    profileLoaded,
    loadTodayAttendance()
]).then(function ([profile, records]) {
    if (!profile) return;

    renderTodayCard(profile, records);
});

// Attendance history — independent of requests, so one failing doesn't block the other
profileLoaded.then(function (profile) {
    if (!profile) return;
fetch(SPRING_API_BASE + "/attendance/student/" + profile._id)
    .then(function (res) {
        return res.json();
    })
    .then(function (records) {
       const bleRecords = records.filter(r => r.method === "ble");

const total = bleRecords.length;
            const presentCount = bleRecords.filter(r => r.status === "present" || r.status === "late").length;
            const absentCount = total - presentCount;
            const percent = total > 0 ? Math.round((presentCount / total) * 1000) / 10 : 0;

            document.getElementById("attendancePercent").textContent = percent + "%";
            document.getElementById("presentDays").textContent = presentCount;

            const lowBanner = document.getElementById("lowAttendanceBanner");
            const lowText = document.getElementById("lowAttendanceText");
            if (lowBanner && lowText) {
                if (total > 0 && percent < LOW_ATTENDANCE_THRESHOLD) {
                    lowText.textContent = "Your attendance is " + percent + "%, below the required " + LOW_ATTENDANCE_THRESHOLD + "%. Please take steps to improve it.";
                    lowBanner.classList.add("show");
                } else {
                    lowBanner.classList.remove("show");
                }
            }

            document.getElementById("donutChart").style.setProperty("--pct", percent);
            document.getElementById("donutPercent").textContent = percent + "%";
            document.getElementById("legendPresent").textContent = presentCount;
            document.getElementById("legendAbsent").textContent = absentCount;
        })
        .catch(function (err) {
            console.error("Failed to load attendance history:", err);
        });
});

// Requests — loads regardless of whether attendance history succeeded
function loadDashboardRequests() {
    return authFetch("/requests/mine")
        .then(function ({ data: requests }) {
            const pendingCount = requests.filter(r => r.status === "pending").length;
            document.getElementById("pendingRequests").textContent = pendingCount;
            renderRequests(requests);

            const lastSeen = localStorage.getItem("notifLastSeen") || "0";
            const hasUnseenUpdate = requests.some(function (r) {
                return r.status !== "pending" && new Date(r.updatedAt) > new Date(lastSeen);
            });
            const notifDot = document.getElementById("notifDot");
            if (notifDot) {
                notifDot.style.display = hasUnseenUpdate ? "block" : "none";
            }
        })
        .catch(function (err) {
            console.error("Failed to load requests:", err);
            const activityList = document.getElementById("activityList");
            if (activityList) {
                activityList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Could not load requests. Is the server running?</p>';
            }
        });
}

loadDashboardRequests();

// Apply Leave/OD modal
const applyModal = document.getElementById("applyModal");
const applyBtn = document.getElementById("applyBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const applyForm = document.getElementById("applyForm");
const modalStatus = document.getElementById("modalStatus");
const modalSubmitBtn = document.getElementById("modalSubmitBtn");

applyBtn.addEventListener("click", function () {
    applyModal.classList.add("show");
    const notifNavBtn = document.getElementById("notifNavBtn");
if (notifNavBtn) {
    notifNavBtn.addEventListener("click", function () {
        localStorage.setItem("notifLastSeen", new Date().toISOString());
        const dot = document.getElementById("notifDot");
        if (dot) dot.style.display = "none";
    });
}
});

cancelModalBtn.addEventListener("click", function () {
    applyModal.classList.remove("show");
});

applyModal.addEventListener("click", function (e) {
    if (e.target === applyModal) applyModal.classList.remove("show");
});

applyForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const type = document.getElementById("requestType").value;
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;
    const reason = document.getElementById("reason").value.trim();

    modalStatus.classList.remove("show", "success", "fail");

    if (!fromDate || !toDate || !reason) {
        modalStatus.textContent = "Please fill in all fields.";
        modalStatus.classList.add("show", "fail");
        return;
    }

    modalSubmitBtn.disabled = true;
    modalSubmitBtn.textContent = "Submitting...";

    authFetch("/requests", {
        method: "POST",
        body: JSON.stringify({ type, fromDate, toDate, reason })
    })
        .then(function ({ status, data }) {
            modalSubmitBtn.disabled = false;
            modalSubmitBtn.textContent = "Submit";

            if (status !== 201) {
                modalStatus.textContent = data.error || "Something went wrong.";
                modalStatus.classList.add("show", "fail");
                return;
            }

            modalStatus.textContent = data.message;
            modalStatus.classList.add("show", "success");
            applyForm.reset();

            return loadDashboardRequests().then(function () {
                setTimeout(function () {
                    applyModal.classList.remove("show");
                    modalStatus.classList.remove("show", "success");
                }, 1200);
            });
        })
        .catch(function () {
            modalSubmitBtn.disabled = false;
            modalSubmitBtn.textContent = "Submit";
            modalStatus.textContent = "Could not reach the server.";
            modalStatus.classList.add("show", "fail");
        });
});