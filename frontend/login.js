const API_BASE = "http://localhost:5000/api";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formStatus = document.getElementById("formStatus");
const togglePassword = document.getElementById("togglePassword");
const submitBtn = document.getElementById("submitBtn");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(input, errorEl, message) {
    input.classList.add("error");
    errorEl.textContent = message;
    errorEl.classList.add("show");
}

function clearError(input, errorEl) {
    input.classList.remove("error");
    errorEl.classList.remove("show");
    errorEl.textContent = "";
}

function validateEmail() {
    const value = emailInput.value.trim();

    if (value === "") {
        setError(emailInput, emailError, "Email is required.");
        return false;
    }

    if (!emailPattern.test(value)) {
        setError(emailInput, emailError, "Enter a valid email address.");
        return false;
    }

    clearError(emailInput, emailError);
    return true;
}

function validatePassword() {
    const value = passwordInput.value;

    if (value === "") {
        setError(passwordInput, passwordError, "Password is required.");
        return false;
    }

    if (value.length < 6) {
        setError(passwordInput, passwordError, "Password must be at least 6 characters.");
        return false;
    }

    clearError(passwordInput, passwordError);
    return true;
}

emailInput.addEventListener("blur", validateEmail);
passwordInput.addEventListener("blur", validatePassword);

emailInput.addEventListener("input", function () {
    if (emailInput.classList.contains("error")) validateEmail();
});

passwordInput.addEventListener("input", function () {
    if (passwordInput.classList.contains("error")) validatePassword();
});

if (togglePassword) {
    togglePassword.addEventListener("click", function () {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        togglePassword.classList.toggle("fa-eye");
        togglePassword.classList.toggle("fa-eye-slash");
    });
}

loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    formStatus.classList.remove("show", "success", "fail");

    if (!isEmailValid || !isPasswordValid) {
        formStatus.textContent = "Please fix the errors above.";
        formStatus.classList.add("show", "fail");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';

    fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
    })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';

            if (status !== 200) {
                formStatus.textContent = data.error || "Login failed.";
                formStatus.classList.add("show", "fail");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            formStatus.textContent = "Login successful! Redirecting...";
            formStatus.classList.add("show", "success");

            const actualRole = data.user.role;
            window.location.href = actualRole === "teacher" ? "teacher-dashboard.html" : "student-dashboard.html";
        })
        .catch(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right"></i>';
            formStatus.textContent = "Could not reach the server.";
            formStatus.classList.add("show", "fail");
        });
});