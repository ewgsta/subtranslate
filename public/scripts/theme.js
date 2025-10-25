(function () {
  const root = document.documentElement;
  const body = document.body;
  const THEME_KEY = "subtranslate-theme";
  const THEMES = ["system", "light", "dark"];

  const toggleButton = document.querySelector("[data-theme-toggle]");
  const selector = document.querySelector("[data-theme-selector]");
  const menu = document.querySelector("[data-theme-menu]");
  const activeIconSlot = document.querySelector("[data-theme-active-icon]");
  const activeLabel = document.querySelector("[data-theme-active-label]");
  const options = menu ? menu.querySelectorAll("[data-theme-option]") : [];

  const iconMap = {
    system: "monitor",
    light: "sun",
    dark: "moon-star",
  };

  function applyTheme(theme) {
    body.classList.remove("theme-system", "theme-light", "theme-dark");
    body.classList.add(`theme-${theme}`);
    root.dataset.theme = theme;

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
      body.dataset.colorMode = prefersDark.matches ? "dark" : "light";
    } else {
      body.dataset.colorMode = theme;
    }
  }

  function renderActiveIcon(theme) {
    if (!activeIconSlot || typeof window.lucide === "undefined") {
      return;
    }

    const iconName = iconMap[theme] || iconMap.system;
    const iconFactory = window.lucide.createIcon;

    if (typeof iconFactory !== "function") {
      return;
    }

    activeIconSlot.innerHTML = "";
    try {
      const svg = iconFactory(iconName, { size: 18, strokeWidth: 1.8 });
      activeIconSlot.appendChild(svg);
    } catch (error) {
      console.warn("Aktif tema ikonu cizilemedi:", error);
    }
  }

  function updateOptionState(theme) {
    options.forEach((option) => {
      const value = option.getAttribute("data-theme-option");
      const isActive = value === theme;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-checked", String(isActive));
    });
    if (activeLabel) {
      if (theme === "system") {
        activeLabel.textContent = "Sistem";
      } else if (theme === "light") {
        activeLabel.textContent = "Aydinlik";
      } else {
        activeLabel.textContent = "Koyu";
      }
    }
    renderActiveIcon(theme);
  }

  async function persistTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.warn("Tema tercihi kaydedilemedi:", error);
    }

    try {
      await fetch("/api/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme }),
        keepalive: true,
      });
    } catch (error) {
      console.warn("Tema guncellemesi sunucuya iletilemedi:", error);
    }
  }

  function setTheme(theme, shouldPersist) {
    if (!THEMES.includes(theme)) {
      theme = "system";
    }

    applyTheme(theme);
    updateOptionState(theme);

    if (shouldPersist) {
      void persistTheme(theme);
    }
  }

  function toggleMenu(forceState) {
    if (!selector || !toggleButton || !menu) {
      return;
    }
    const isOpen =
      typeof forceState === "boolean"
        ? forceState
        : !selector.classList.contains("is-open");

    selector.classList.toggle("is-open", isOpen);
    toggleButton.setAttribute("aria-expanded", String(isOpen));
  }

  if (toggleButton) {
    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });
  }

  options.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.getAttribute("data-theme-option");
      setTheme(value || "system", true);
      toggleMenu(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!selector) {
      return;
    }
    if (!selector.containsevent.target) {
      toggleMenu(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleMenu(false);
    }
  });

  const storedTheme = (() => {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value && THEMES.includes(value) ? value : null;
    } catch (_error) {
      return null;
    }
  })();

  setTheme(storedTheme ?? root.dataset.theme ?? "system", false);

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDark.addEventListener("change", () => {
    const currentTheme = root.dataset.theme || "system";
    if (currentTheme === "system") {
      setTheme("system", false);
    }
  });
})();
