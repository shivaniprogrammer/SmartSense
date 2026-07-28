const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("active");

    const menuIcon = menuBtn.querySelector("i");

    if (navLinks.classList.contains("active")) {
        menuIcon.classList.remove("fa-bars");
        menuIcon.classList.add("fa-xmark");
    } else {
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
    }
});


const navigationLinks = document.querySelectorAll(".nav-links a");

navigationLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        navLinks.classList.remove("active");

        const menuIcon = menuBtn.querySelector("i");
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
    });
});

const studentLoginBtn = document.querySelector(".role-card:nth-child(1) button");
const teacherLoginBtn = document.querySelector(".role-card:nth-child(2) button");
const getStartedBtns = document.querySelectorAll(".get-started-btn, .primary-btn, .cta-primary");
const navLoginBtn = document.querySelector(".login-btn");

if (studentLoginBtn) {
    studentLoginBtn.addEventListener("click", function () {
        window.location.href = "login-student.html";
    });
}

if (teacherLoginBtn) {
    teacherLoginBtn.addEventListener("click", function () {
        window.location.href = "login-teacher.html";
    });
}

getStartedBtns.forEach(function (button) {
    button.addEventListener("click", function () {
        window.location.href = "register.html";
    });
});

if (navLoginBtn) {
    navLoginBtn.addEventListener("click", function () {
        window.location.href = "login-student.html";
    });
}