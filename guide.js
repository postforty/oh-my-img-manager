(function() {
  // Execute immediately to set theme on document.documentElement
  try {
    var savedTheme = localStorage.getItem("oh_my_img_theme");
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = (savedTheme === "light" || savedTheme === "dark") ? savedTheme : (prefersLight ? "light" : "dark");
    document.documentElement.className = theme + "-theme";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.className = "dark-theme";
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();

function applyTheme(theme) {
  var isDark = theme === "dark";
  var addClass = isDark ? "dark-theme" : "light-theme";
  var removeClass = isDark ? "light-theme" : "dark-theme";
  
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove(removeClass);
  document.documentElement.classList.add(addClass);
  
  if (document.body) {
    document.body.setAttribute("data-theme", theme);
    document.body.classList.remove(removeClass);
    document.body.classList.add(addClass);
  }
}

document.addEventListener("DOMContentLoaded", function() {
  // Apply theme to body once it's ready
  var currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(currentTheme);

  var btnThemeToggle = document.getElementById("btnThemeToggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", function() {
      var isCurrentlyLight = document.documentElement.classList.contains("light-theme");
      var nextTheme = isCurrentlyLight ? "dark" : "light";
      applyTheme(nextTheme);
      localStorage.setItem("oh_my_img_theme", nextTheme);
    });
  }

  // Sync across tabs
  window.addEventListener("storage", function(e) {
    if (e.key === "oh_my_img_theme" && (e.newValue === "light" || e.newValue === "dark")) {
      applyTheme(e.newValue);
    }
  });
});
