const API_BASE = "http://localhost:5000/api";

const registerForm = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const studentIdInput = document.getElementById("studentId");
const parentEmailInput = document.getElementById("parentEmail");
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
    if (studentIdInput.value.trim() === "") {
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

[nameInput, studentIdInput, emailInput, passwordInput, confirmPasswordInput].forEach(function (input) {
    input.addEventListener("blur", function () {
        if (input === nameInput) validateName();
        if (input === studentIdInput) validateStudentId();
        if (input === emailInput) validateEmail();
        if (input === passwordInput) validatePassword();
        if (input === confirmPasswordInput) validateConfirmPassword();
    });

    input.addEventListener("input", function () {
        if (input.classList.contains("error")) {
            if (input === nameInput) validateName();
            if (input === studentIdInput) validateStudentId();
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
    const isStudentIdValid = validateStudentId();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();

    formStatus.classList.remove("show", "success", "fail");

    if (!isNameValid || !isStudentIdValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
        formStatus.textContent = "Please fix the errors above.";
        formStatus.classList.add("show", "fail");
        return;
    }

    const role = document.querySelector('input[name="role"]:checked').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    fetch(API_BASE + "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: nameInput.value.trim(),
            studentId: studentIdInput.value.trim(),
            parentEmail: parentEmailInput.value.trim() || undefined,
            email: emailInput.value.trim(),
            password: passwordInput.value,
            role: role
        })
    })
        .then(res => res.json().then(data => ({ status: res.status, data })))
        .then(({ status, data }) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';

            if (status !== 201) {
                formStatus.textContent = data.error || "Registration failed.";
                formStatus.classList.add("show", "fail");
                return;
            }

            formStatus.textContent = data.message || "Account created! You can now log in.";
            formStatus.classList.add("show", "success");
            registerForm.reset();
        })
        .catch(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
            formStatus.textContent = "Could not reach the server.";
            formStatus.classList.add("show", "fail");
        });
});