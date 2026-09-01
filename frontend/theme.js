// theme.js
// SmartSense Theme Selector
// Works on BOTH student and teacher pages
// Renders as a small palette icon next to the profile pill, top-right.
// Visibility controlled directly via inline styles - no dependency on CSS classes.

(function () {

    const themes = {
        teal: { name: "Teal", primary: "#0f9fa8", dark: "#087f86", light: "#dff7f8", soft: "#eefafb", bg: "#f7fbfc", border: "#d9ecee" },
        blue: { name: "Ocean", primary: "#2563eb", dark: "#1d4ed8", light: "#dbeafe", soft: "#eff6ff", bg: "#f6f9ff", border: "#dbe5f5" },
        purple: { name: "Purple", primary: "#7c3aed", dark: "#6d28d9", light: "#ede9fe", soft: "#f5f3ff", bg: "#faf9ff", border: "#e5e0f4" },
        pink: { name: "Pink", primary: "#db2777", dark: "#be185d", light: "#fce7f3", soft: "#fdf2f8", bg: "#fff9fc", border: "#f1d8e5" },
        rose: { name: "Rose", primary: "#e11d48", dark: "#be123c", light: "#ffe4e6", soft: "#fff1f2", bg: "#fff9fa", border: "#f3d8dc" },
        red: { name: "Ruby", primary: "#dc2626", dark: "#b91c1c", light: "#fee2e2", soft: "#fef2f2", bg: "#fffafa", border: "#f2d7d7" },
        orange: { name: "Orange", primary: "#ea580c", dark: "#c2410c", light: "#ffedd5", soft: "#fff7ed", bg: "#fffaf6", border: "#f1ddcf" },
        amber: { name: "Amber", primary: "#d97706", dark: "#b45309", light: "#fef3c7", soft: "#fffbeb", bg: "#fffdf7", border: "#eee2c7" },
        green: { name: "Emerald", primary: "#059669", dark: "#047857", light: "#d1fae5", soft: "#ecfdf5", bg: "#f7fdfb", border: "#d5ece3" },
        cyan: { name: "Cyan", primary: "#0891b2", dark: "#0e7490", light: "#cffafe", soft: "#ecfeff", bg: "#f6fdff", border: "#d2e9ee" },
        indigo: { name: "Indigo", primary: "#4f46e5", dark: "#4338ca", light: "#e0e7ff", soft: "#eef2ff", bg: "#f8f9ff", border: "#dfe3f5" },
        midnight: { name: "Midnight", primary: "#475569", dark: "#334155", light: "#e2e8f0", soft: "#f1f5f9", bg: "#f8fafc", border: "#dbe2ea" }
    };

    let popupCreated = false;

    function applyTheme(themeName) {
        const theme = themes[themeName] || themes.teal;
        const root = document.documentElement;

        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--primary-dark", theme.dark);
        root.style.setProperty("--primary-light", theme.light);
        root.style.setProperty("--primary-soft", theme.soft);
        root.style.setProperty("--bg", theme.bg);
        root.style.setProperty("--background", theme.bg);
        root.style.setProperty("--border", theme.border);

        localStorage.setItem("smartsenseTheme", themeName);

        document.querySelectorAll(".theme-option").forEach(function (button) {
            button.classList.toggle("selected", button.dataset.theme === themeName);
        });
    }

    function createThemeButton() {
        if (document.getElementById("themeButton")) {
            return;
        }

        const profilePill = document.querySelector(".profile-pill");
        if (!profilePill || !profilePill.parentElement) {
            return;
        }

        const button = document.createElement("button");
        button.id = "themeButton";
        button.className = "theme-icon-button";
        button.title = "Select theme";
        button.type = "button";
        button.innerHTML = "🎨";

        profilePill.parentElement.insertBefore(button, profilePill);

        createThemePopup(button);
    }

    function createThemePopup(button) {
        if (popupCreated) return;
        popupCreated = true;



         const popup = document.createElement("div");
popup.id = "themePopup";
popup.className = "theme-popup";
popup.style.cssText = "display:none; position:fixed; z-index:9999; top:80px; right:20px; background:#ffffff; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.15); padding:24px; max-width:360px;"; // force hidden by default

        popup.innerHTML = `
            <button type="button" class="theme-close" id="themeClose">✕</button>
            <h2>Select Theme 🎨</h2>
            <p>Choose your SmartSense colour</p>
            <div class="theme-grid" id="themeGrid"></div>
        `;

        document.body.appendChild(popup);

        const grid = document.getElementById("themeGrid");

        Object.entries(themes).forEach(function ([key, theme]) {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "theme-option";
            option.dataset.theme = key;
            option.innerHTML = `
                <div class="theme-color" style="--theme-primary:${theme.primary}; --theme-dark:${theme.dark};"></div>
                <span>${theme.name}</span>
            `;

            option.addEventListener("click", function () {
                applyTheme(key);
                closePopup();
            });

            grid.appendChild(option);
        });

      function openPopup() {
    popup.style.display = "block";
}

function closePopup() {
    popup.style.display = "none";
}

        button.addEventListener("click", openPopup);
        document.getElementById("themeClose").addEventListener("click", closePopup);
       
    }

    function start() {
        const savedTheme = localStorage.getItem("smartsenseTheme") || "teal";
        applyTheme(savedTheme);

        const tryCreate = setInterval(function () {
            const profilePill = document.querySelector(".profile-pill");
            if (profilePill) {
                createThemeButton();
                clearInterval(tryCreate);
            }
        }, 100);

        setTimeout(function () { clearInterval(tryCreate); }, 3000);
    }

    document.addEventListener("DOMContentLoaded", start);
})();