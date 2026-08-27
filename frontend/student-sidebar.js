// student-sidebar.js
// Include on every student page:
//   1. <link rel="stylesheet" href="student-sidebar.css"> in <head>
//   2. <div id="sidebar-root"></div> where the sidebar should appear
//   3. <script src="student-sidebar.js"></script> before </body>

(function () {
     const API_BASE = "/api";
  const currentPage = window.location.pathname.split("/").pop();
  const token = localStorage.getItem("token");

  const navItems = [
    { href: "student-dashboard.html", icon: "fa-house", label: "Dashboard" },
    { href: "Student-attendance.html", icon: "fa-calendar-check", label: "Attendance" },
    { href: "leave-od.html", icon: "fa-file-lines", label: "Leave & OD", dot: true },
  ];

  const navHtml = navItems.map(function (item) {
    const isActive = item.href === currentPage;
    const dotHtml = item.dot ? '<span class="nav-dot" id="notifDot"></span>' : "";
    return (
      '<a href="' + item.href + '" class="nav-item' + (isActive ? " active" : "") + '">' +
        '<i class="fa-solid ' + item.icon + '"></i> ' + item.label + dotHtml +
      '</a>'
    );
  }).join("");

  const sidebarHtml =
    '<aside class="sidebar">' +
      '<div class="sidebar-brand">' +
        '<div class="icon"><i class="fa-solid fa-graduation-cap"></i></div>' +
        '<h2>SmartSense</h2>' +
      '</div>' +
      navHtml +
      '<div class="sidebar-bottom">' +
        '<button class="nav-item" id="sidebarLogoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>' +
      '</div>' +
    '</aside>';

  const root = document.getElementById("sidebar-root");
  if (root) {
    root.outerHTML = sidebarHtml;
  } else {
    console.error("student-sidebar.js: no element with id='sidebar-root' found on this page.");
    return;
  }

  const logoutBtn = document.getElementById("sidebarLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login-student.html";
    });
  }

  // Light up the Leave & OD dot if there's an approved/rejected request the student hasn't seen yet
  if (token) {
    fetch(API_BASE + "/requests/mine", {
      headers: { "Authorization": "Bearer " + token }
    })
      .then(function (res) { return res.json(); })
      .then(function (requests) {
        if (!Array.isArray(requests)) return;
        const lastSeen = localStorage.getItem("notifLastSeen") || "0";
        const hasUnseen = requests.some(function (r) {
          return r.status !== "pending" && new Date(r.updatedAt) > new Date(lastSeen);
        });
        const dot = document.getElementById("notifDot");
        if (dot && hasUnseen) dot.classList.add("show");
      })
      .catch(function () {});
  }
})();