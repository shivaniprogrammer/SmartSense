/* dashboard.js: student dashboard.
   API contracts are unchanged: GET /api/students/me, GET /api/requests/mine, POST /api/requests,
   GET {ATTENDANCE_API_BASE}/attendance/student-id/:studentId */

const API_BASE = "/api";

const ATTENDANCE_API_BASE = "https://smartsense-java-backend.onrender.com";

const LOW_ATTENDANCE_THRESHOLD = 75;
// false = count every record (same as the Attendance page). true = count BLE records only (old dashboard behaviour).
const COUNT_BLE_ONLY = false;
const REGISTER_NUMBER_PREFIX = "310625104";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "login-student.html"; }

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isoDate = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const showDate = (v) => { const d = new Date(v); return isNaN(d) ? esc(v) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };

function authFetch(path, options = {}) {
    return fetch(API_BASE + path, {
        ...options,
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, ...(options.headers || {}) }
    }).then((res) => {
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login-student.html";
            return Promise.reject(new Error("Unauthorized"));
        }
        return res.json().then((data) => ({ status: res.status, data }));
    });
}

/* ---------- profile ---------- */
function studentIdToRegisterNumber(studentId) {
    const m = String(studentId || "").match(/(\d{3})$/);
    return m ? REGISTER_NUMBER_PREFIX + m[1] : null;
}

function renderProfile(p) {
    if (!p) return;
    if (p.name) {
        const first = p.name.split(" ")[0];
        $("studentName").textContent = first;
        $("profileName").textContent = first;
        $("avatarInitial").textContent = p.name.charAt(0).toUpperCase();
    }
    const reg = p.registerNumber || studentIdToRegisterNumber(p.studentId);
    $("studentRegNo").textContent = reg ? "Reg No: " + reg : "";
}

try { renderProfile(JSON.parse(localStorage.getItem("user") || "null")); } catch (e) {}

/* ---------- timetable (today / up next) ---------- */
function renderTimetable() {
    const now = new Date(), dow = now.getDay(), weekday = dow >= 1 && dow <= 5;
    const di = weekday ? dow - 1 : 0, slots = SS.TT[di], mins = now.getHours() * 60 + now.getMinutes();
    const upIdx = weekday ? slots.findIndex((s) => SS.endMin(s[2]) > mins) : 0;
    const up = slots[upIdx < 0 ? 0 : upIdx], n = SS.info(up[0]);

    let label;
    if (!weekday) label = "No classes today · first class on Monday";
    else if (upIdx < 0) label = "Classes are over for today · first class on Monday";
    else label = SS.startMin(up[1]) <= mins ? "In progress" : "Up next";

    $("nextCard").innerHTML = "<small>" + label + "</small><strong>" + esc(n.name) + "</strong><small>" +
        SS.timeLabel(up[1], up[2]) + (n.lab ? "" : " · Room " + SS.room) + " · " + esc(n.faculty) + "</small>";
    $("ttHeading").textContent = weekday ? "Today’s timetable" : "Monday’s timetable";
    $("todayList").innerHTML = slots.map((s, i) => {
        const x = SS.info(s[0]);
        return '<div class="tt-row' + (weekday && i === upIdx ? " now" : "") + '"><div><b>' + esc(x.name) + "</b><small>" +
            esc(x.faculty) + '</small></div><span class="tm">' + SS.timeLabel(s[1], s[2]) + "</span></div>";
    }).join("");
}

/* ---------- attendance ---------- */
function setAttendanceUnavailable(msg) {
    ["attendancePercent", "presentDays", "absentDays", "legendPresent", "legendAbsent", "donutPercent"].forEach((id) => { $(id).textContent = "--"; });
    $("donutChart").style.setProperty("--pct", 0);
    const note = $("attendanceNote");
    note.textContent = msg;
    note.className = "note err";
    renderTodayStatus([], false);
}

function renderTodayStatus(records, loaded) {
    const today = new Date(), dow = today.getDay();
    $("todayDate").textContent = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    const badge = $("todayStatusBadge"), text = $("todayStatusText");
    badge.classList.remove("present", "absent", "holiday");

    if (dow === 0 || dow === 6) { badge.classList.add("holiday"); text.textContent = "Holiday"; return; }
    if (!loaded) { text.textContent = "--"; return; }

    const todays = records.filter((r) => String(r.date || "").slice(0, 10) === isoDate(today));
    if (!todays.length) { text.textContent = "Not marked yet"; return; }
    if (todays.some((r) => r.status === "present" || r.status === "late")) { badge.classList.add("present"); text.textContent = "Present"; }
    else { badge.classList.add("absent"); text.textContent = "Absent"; }
}

function loadAttendance(profile) {
    return fetch(ATTENDANCE_API_BASE + "/attendance/student-id/" + encodeURIComponent(profile.studentId), {
        headers: { "Authorization": "Bearer " + token }
    })
        .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then((all) => {
            if (!Array.isArray(all)) throw new Error("Unexpected response");
            const records = COUNT_BLE_ONLY ? all.filter((r) => (r.method || "").toLowerCase() === "ble") : all;
            const total = records.length;
            const present = records.filter((r) => r.status === "present" || r.status === "late").length;
            const absent = records.filter((r) => r.status === "absent").length;
            const pct = total ? Math.round((present / total) * 1000) / 10 : 0;

            $("attendancePercent").textContent = total ? pct + "%" : "--";
            $("presentDays").textContent = present;
            $("absentDays").textContent = absent;
            $("legendPresent").textContent = present;
            $("legendAbsent").textContent = absent;
            $("donutPercent").textContent = total ? pct + "%" : "--";
            $("donutChart").style.setProperty("--pct", pct);

            const note = $("attendanceNote");
            note.className = "note";
            note.textContent = total ? total + " periods recorded" : "No attendance records yet.";

            const banner = $("lowAttendanceBanner");
            if (total && pct < LOW_ATTENDANCE_THRESHOLD) {
                $("lowAttendanceText").textContent = "Your attendance is " + pct + "%, below the required " + LOW_ATTENDANCE_THRESHOLD + "%. Please take steps to improve it.";
                banner.classList.add("show");
            } else banner.classList.remove("show");

            renderTodayStatus(records, true);
        })
        .catch((err) => {
            console.error("Failed to load attendance:", err);
            setAttendanceUnavailable("Could not load attendance (" + err.message + "). Check that the attendance server is running at " + ATTENDANCE_API_BASE + ".");
        });
}

/* ---------- requests ---------- */
function renderRequests(requests) {
    const list = $("activityList");
    if (!requests.length) { list.innerHTML = '<p class="note">No requests yet.</p>'; return; }
    const icon = { pending: "fa-hourglass-half", approved: "fa-check", rejected: "fa-xmark" };
    list.innerHTML = requests.slice(0, 4).map((r) => {
        const st = ["pending", "approved", "rejected"].includes(r.status) ? r.status : "pending";
        return '<div class="activity-item"><div class="activity-icon ' + st + '"><i class="fa-solid ' + icon[st] + '"></i></div><div>' +
            "<h5>" + (r.type === "od" ? "On Duty" : "Leave") + '<span class="badge ' + st + '">' + st.charAt(0).toUpperCase() + st.slice(1) + "</span></h5>" +
            "<p>" + showDate(r.fromDate) + " to " + showDate(r.toDate) + " · " + esc(r.reason) + "</p></div></div>";
    }).join("");
}

function loadRequests() {
    return authFetch("/requests/mine")
        .then(({ status, data }) => {
            if (status !== 200 || !Array.isArray(data)) throw new Error("HTTP " + status);
            $("pendingRequests").textContent = data.filter((r) => r.status === "pending").length;
            renderRequests(data);
        })
        .catch((err) => {
            console.error("Failed to load requests:", err);
            $("pendingRequests").textContent = "--";
            $("activityList").innerHTML = '<p class="note err">Could not load requests. Is the server running?</p>';
        });
}

/* ---------- start ---------- */
renderTimetable();
renderTodayStatus([], false);
loadRequests();

authFetch("/students/me")
    .then(({ status, data }) => {
        if (status !== 200 || !data) throw new Error("HTTP " + status);
        localStorage.setItem("user", JSON.stringify(data));
        renderProfile(data);
        return loadAttendance(data);
    })
    .catch((err) => {
        console.error("Failed to load profile:", err);
        setAttendanceUnavailable("Could not load your profile. Please log in again.");
    });

/* ---------- Apply Leave / OD ---------- */
const modal = $("applyModal"), form = $("applyForm"), mStatus = $("modalStatus"), submitBtn = $("modalSubmitBtn");
let submitting = false;

const openModal = () => modal.classList.add("show");
const closeModal = () => { if (!submitting) modal.classList.remove("show"); };
$("applyBtn").addEventListener("click", openModal);
$("cancelModalBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function setErrors(e) {
    $("fromErr").textContent = e.from || "";
    $("toErr").textContent = e.to || "";
    $("reasonErr").textContent = e.reason || "";
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting) return;                              // duplicate-submit guard

    const type = $("requestType").value, fromDate = $("fromDate").value, toDate = $("toDate").value, reason = $("reason").value.trim();
    const err = {};
    if (!fromDate) err.from = "Choose a start date.";
    if (!toDate) err.to = "Choose an end date.";
    else if (fromDate && toDate < fromDate) err.to = "End date can’t be before the start date.";
    if (reason.length < 5) err.reason = "Please give a short reason (at least 5 characters).";
    setErrors(err);
    mStatus.className = "modal-status";
    if (Object.keys(err).length) return;

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    authFetch("/requests", { method: "POST", body: JSON.stringify({ type, fromDate, toDate, reason }) })
        .then(({ status, data }) => {
            if (status !== 201) {                         // only a real 201 counts as success
                mStatus.textContent = (data && data.error) || "Something went wrong. Please try again.";
                mStatus.className = "modal-status show fail";
                return;
            }
            mStatus.textContent = (type === "od" ? "OD" : "Leave") + " application submitted successfully!";
            mStatus.className = "modal-status show success";
            form.reset();
            return loadRequests().then(() => { // shows the status the backend actually returned
                setTimeout(() => { submitting = false; closeModal(); mStatus.className = "modal-status"; }, 1500);
            });
        })
        .catch((err2) => {
            if (err2 && err2.message === "Unauthorized") return;
            mStatus.textContent = "Could not reach the server. Your application was not sent, so please try again.";
            mStatus.className = "modal-status show fail";
        })
        .finally(() => {
            submitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
        });
});