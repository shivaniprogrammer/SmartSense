const API_BASE = "http://localhost:5000/api";

const token = localStorage.getItem("token");
const storedUser = localStorage.getItem("user");

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

// Load profile, then attendance history and requests
authFetch("/students/me")
    .then(function ({ data: profile }) {
        user = profile;
        localStorage.setItem("user", JSON.stringify(profile));

        if (profile.name) {
            const firstName = profile.name.split(" ")[0];
            studentNameEl.textContent = firstName;
            profileNameEl.textContent = firstName;
            avatarInitialEl.textContent = profile.name.charAt(0).toUpperCase();
        }

        return authFetch("/attendance/history/" + profile._id);
    })
    .then(function ({ data: records }) {
        const total = records.length;
        const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
        const absentCount = total - presentCount;
        const percent = total > 0 ? Math.round((presentCount / total) * 1000) / 10 : 0;

        document.getElementById("attendancePercent").textContent = percent + "%";
        document.getElementById("presentDays").textContent = presentCount;

        document.getElementById("donutChart").style.setProperty("--pct", percent);
        document.getElementById("donutPercent").textContent = percent + "%";
        document.getElementById("legendPresent").textContent = presentCount;
        document.getElementById("legendAbsent").textContent = absentCount;

        return authFetch("/requests/mine");
    })
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
    .catch(function () {
        // silently ignore if unauthorized redirect already fired
    });

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

            return authFetch("/requests/mine").then(function ({ data: requests }) {
                const pendingCount = requests.filter(r => r.status === "pending").length;
                document.getElementById("pendingRequests").textContent = pendingCount;
                renderRequests(requests);

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