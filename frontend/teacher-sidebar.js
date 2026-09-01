// teacher-sidebar.js
(function () {
  const currentPage = window.location.pathname.split("/").pop();

  const navItems = [
    { href: "teacher-dashboard.html", icon: "fa-house", label: "Dashboard" },
    { href: "teacher-students.html", icon: "fa-user-graduate", label: "Students" },
    
    { href: "teacher-reports.html", icon: "fa-file-lines", label: "Reports" },
    { href: "teacher-requests.html", icon: "fa-bell", label: "Leave & OD" },
  ];

  const navHtml = navItems.map(function (item) {
    const isActive = item.href === currentPage;
    return (
      '<a href="' + item.href + '" class="nav-item' + (isActive ? " active" : "") + '">' +
        '<i class="fa-solid ' + item.icon + '"></i> ' + item.label +
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
      '<div style="margin-top: auto;">' +
        '<button class="nav-item" id="sidebarLogoutBtn" style="background:none;border:none;width:100%;text-align:left;cursor:pointer;font-family:inherit;">' +
          '<i class="fa-solid fa-right-from-bracket"></i> Logout' +
        '</button>' +
      '</div>' +
    '</aside>';

  const root = document.getElementById("sidebar-root");
  if (root) {
    root.outerHTML = sidebarHtml;
  } else {
    console.error("teacher-sidebar.js: no element with id='sidebar-root' found on this page.");
    return;
  }

  const logoutBtn = document.getElementById("sidebarLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login-teacher.html";
    });
  }
})();