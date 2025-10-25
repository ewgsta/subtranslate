(function () {
  const lucideReady = () => {
    if (typeof window.lucide !== "undefined" && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lucideReady);
  } else {
    lucideReady();
  }

  const modal = document.querySelector("[data-auth-modal]");
  const openButtons = document.querySelectorAll("[data-open-auth-modal]");
  const closeElements = document.querySelectorAll("[data-close-auth-modal]");
  const modalPanel = modal ? modal.querySelector(".modal-panel") : null;

  let focusTrapTarget = null;
  let focusTrapHandler = null;
  let previouslyFocusedElement = null;

  function trapFocus(element) {
    const focusableSelectors = [
      "a[href]",
      "button",
      "textarea",
      "input",
      "select",
      '[tabindex]:not([tabindex="-1"])',
    ];

    const focusable = Array.from(
      element.querySelectorAll(focusableSelectors.join(","))
    ).filter((node) => !node.hasAttribute("disabled"));

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeydown(event) {
      if (event.key !== "Tab") {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    if (focusTrapTarget && focusTrapHandler) {
      focusTrapTarget.removeEventListener("keydown", focusTrapHandler);
    }

    element.addEventListener("keydown", handleKeydown);
    focusTrapTarget = element;
    focusTrapHandler = handleKeydown;
    first.focus();
  }

  function openModal() {
    if (!modal) {
      return;
    }
    previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    modal.classList.remove("is-hidden");
    modal.classList.add("is-visible");
    document.body.classList.add("modal-open");
    trapFocus(modal);
  }

  function closeModal() {
    if (!modal) {
      return;
    }
    modal.classList.remove("is-visible");
    modal.classList.add("is-hidden");
    document.body.classList.remove("modal-open");
    if (focusTrapTarget && focusTrapHandler) {
      focusTrapTarget.removeEventListener("keydown", focusTrapHandler);
    }
    focusTrapTarget = null;
    focusTrapHandler = null;

    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
      previouslyFocusedElement = null;
    }
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
  });

  closeElements.forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (!modalPanel) {
        return;
      }

      if (!modal.classList.contains("is-visible")) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!modalPanel.contains(target)) {
        closeModal();
      }
    });
  }

  const tabButtons = document.querySelectorAll("[data-auth-tab]");
  const tabPanels = document.querySelectorAll("[data-auth-panel]");

  function setActiveTab(target) {
    tabButtons.forEach((button) => {
      const value = button.getAttribute("data-auth-tab");
      const isActive = value === target;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    tabPanels.forEach((panel) => {
      const value = panel.getAttribute("data-auth-panel");
      const isActive = value === target;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", String(!isActive));
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-auth-tab") || "login";
      setActiveTab(target);
    });
  });

  if (tabButtons.length) {
    setActiveTab("login");
  }
})();




