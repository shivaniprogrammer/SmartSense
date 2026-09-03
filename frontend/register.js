const API_BASE = "/api";

const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const studentIdInput = document.getElementById("studentId");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const nameError = document.getElementById("nameError");
const studentIdError = document.getElementById("studentIdError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

const formStatus = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");

// Role Radio buttons & Container
const roleStudent = document.getElementById("roleStudent");
const roleTeacher = document.getElementById("roleTeacher");
const studentIdContainer = document.getElementById("studentIdContainer");

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

function validateName() {
    if (nameInput.value.trim() === "") {
        setError(nameInput, nameError, "Full name is required.");
        return false;
    }
    clearError(nameInput, nameError);
    return true;
}

function validateStudentId() {
    // Only required if student role is selected
    if (roleStudent.checked && studentIdInput.value.trim() === "") {
        setError(studentIdInput, studentIdError, "Student ID is required.");
        return false;
    }
    clearError(studentIdInput, studentIdError);
    return true;
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
    if (passwordInput.value.length < 6) {
        setError(passwordInput, passwordError, "Password must be at least 6 characters.");
        return false;
    }

    clearError(passwordInput, passwordError);
    return true;
}

function validateConfirmPassword() {
    if (confirmPasswordInput.value !== passwordInput.value || confirmPasswordInput.value === "") {
        setError(confirmPasswordInput, confirmPasswordError, "Passwords do not match.");
        return false;
    }

    clearError(confirmPasswordInput, confirmPasswordError);
    return true;
}

// Toggle Visibility of Student ID based on Role Selection
function handleRoleChange() {
    if (roleStudent.checked) {
        studentIdContainer.style.display = "block";
    } else {
        studentIdContainer.style.display = "none";
        clearError(studentIdInput, studentIdError);
    }
}

roleStudent.addEventListener("change", handleRoleChange);
roleTeacher.addEventListener("change", handleRoleChange);

// Initialize role field visibility
handleRoleChange();

[nameInput, studentIdInput, emailInput, passwordInput, confirmPasswordInput].forEach(function (input) {
    input.addEventListener("blur", function () {
        if (input === nameInput) validateName();
        if (input === studentIdInput && roleStudent.checked) validateStudentId();
        if (input === emailInput) validateEmail();
        if (input === passwordInput) validatePassword();
        if (input === confirmPasswordInput) validateConfirmPassword();
    });

    input.addEventListener("input", function () {
        if (input.classList.contains("error")) {
            if (input === nameInput) validateName();
            if (input === studentIdInput && roleStudent.checked) validateStudentId();
            if (input === emailInput) validateEmail();
            if (input === passwordInput) validatePassword();
            if (input === confirmPasswordInput) validateConfirmPassword();
        }
    });
});

function setupToggle(toggleId, inputEl) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;

    toggle.addEventListener("click", function () {
        const isPassword = inputEl.type === "password";
        inputEl.type = isPassword ? "text" : "password";
        toggle.classList.toggle("fa-eye");
        toggle.classList.toggle("fa-eye-slash");
    });
}

setupToggle("togglePassword", passwordInput);
setupToggle("toggleConfirmPassword", confirmPasswordInput);

registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const isNameValid = validateName();
    const isStudentIdValid = roleStudent.checked ? validateStudentId() : true;
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();

    formStatus.classList.remove("show", "success", "fail");

    if (!isNameValid || !isStudentIdValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
        formStatus.textContent = "Please fix the errors above.";
        formStatus.classList.add("show", "fail");
        return;
    }

    const role = roleStudent.checked ? "student" : "teacher";

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
        role: role
    };

    if (role === "student") {
        payload.studentId = studentIdInput.value.trim();
    }
    console.log("Submitting registration with email:", payload.email);

    fetch(API_BASE + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';

            if (status !== 201 && status !== 200) {
                formStatus.textContent = data.error || "Registration failed.";
                formStatus.classList.add("show", "fail");
                return;
            }

            formStatus.textContent = data.message || "Account created! Redirecting to verification...";
            formStatus.classList.add("show", "success");

            const registeredEmail = (data && data.email) || emailInput.value.trim();
            const userRole = (data && data.role) || role;

            setTimeout(function () {
                window.location.href = "verify-otp.html?email=" + encodeURIComponent(registeredEmail) + "&role=" + encodeURIComponent(userRole) + "&purpose=register";
            }, 1000);
        })
        .catch(function (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
            console.error("Registration request failed:", err);
            formStatus.textContent = "Could not reach the server. Make sure the backend is running on port 5000.";
            formStatus.classList.add("show", "fail");
        });
});