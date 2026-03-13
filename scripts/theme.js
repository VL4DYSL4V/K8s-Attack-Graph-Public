const THEME_STORAGE_KEY = "attackGraphTheme";

function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
        btn.textContent = theme === "light" ? "Light" : "Dark";
    }
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initial = saved === "light" ? "light" : "dark";
    applyTheme(initial);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
}

function initThemeControls() {
    loadTheme();

    const btn = document.getElementById("theme-toggle");
    if (btn) {
        btn.addEventListener("click", toggleTheme);
    }
}