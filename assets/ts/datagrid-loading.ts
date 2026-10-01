class DataGridLoadingController {
  private readonly root: HTMLElement;
  private overlay: HTMLDivElement | null = null;
  private spinner: HTMLSpanElement | null = null;
  private spinnerAnimation: Animation | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  start(): void {
    if (!this.mount()) {
      return;
    }
    this.bindForms();
    this.bindNavigationLinks();
    this.bindSortableHeaders();
  }

  private mount(): boolean {
    const table = this.root.querySelector<HTMLTableElement>("table");
    const container = table?.parentElement;
    if (!container) {
      return false;
    }

    container.querySelectorAll<HTMLElement>("[data-grid-loading]").forEach((existing) => existing.remove());

    const overlay = document.createElement("div");
    overlay.dataset.gridLoading = "";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-atomic", "true");
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      zIndex: "40",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      cursor: "progress",
      backdropFilter: "blur(1px)",
      boxSizing: "border-box",
    });

    const panel = document.createElement("div");
    panel.dataset.gridLoadingPanel = "";
    Object.assign(panel.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      maxWidth: "320px",
      padding: "12px 16px",
      borderWidth: "1px",
      borderStyle: "solid",
      boxSizing: "border-box",
    });

    const spinner = document.createElement("span");
    spinner.setAttribute("aria-hidden", "true");
    Object.assign(spinner.style, {
      display: "block",
      width: "20px",
      height: "20px",
      flex: "0 0 auto",
      boxSizing: "border-box",
      borderWidth: "2px",
      borderStyle: "solid",
      borderColor: "var(--color-brand-orange)",
      borderRightColor: "transparent",
    });

    const copy = document.createElement("span");
    Object.assign(copy.style, {
      display: "grid",
      gap: "2px",
      minWidth: "0",
    });

    const title = document.createElement("strong");
    title.dataset.gridLoadingTitle = "";
    title.textContent = "Carregando dados";
    Object.assign(title.style, {
      fontSize: "12px",
      fontWeight: "700",
      lineHeight: "1.25",
    });

    const subtitle = document.createElement("span");
    subtitle.dataset.gridLoadingSubtitle = "";
    subtitle.textContent = "Atualizando a tabela...";
    Object.assign(subtitle.style, {
      fontSize: "10px",
      lineHeight: "1.35",
    });

    copy.append(title, subtitle);
    panel.append(spinner, copy);
    overlay.append(panel);
    container.append(overlay);

    this.overlay = overlay;
    this.spinner = spinner;
    return true;
  }

  private bindForms(): void {
    this.root.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
      form.addEventListener("submit", () => this.show());
    });
  }

  private bindNavigationLinks(): void {
    this.root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          anchor.hasAttribute("download") ||
          (anchor.target !== "" && anchor.target !== "_self")
        ) {
          return;
        }

        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
          return;
        }
        this.show();
      });
    });
  }

  private bindSortableHeaders(): void {
    this.root.querySelectorAll<HTMLElement>("[data-grid-header]").forEach((header) => {
      if (!header.querySelector("a[href*='sort=']")) {
        return;
      }
      const label = header.querySelector<HTMLElement>(":scope > div > span:first-child");
      if (!label) {
        return;
      }
      label.addEventListener("click", () => this.show(), { capture: true });
      label.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Enter" || event.key === " ") {
            this.show();
          }
        },
        { capture: true },
      );
    });
  }

  private show(): void {
    if (this.root.getAttribute("aria-busy") === "true" || !this.overlay) {
      return;
    }
    this.applyTheme();
    this.root.setAttribute("aria-busy", "true");
    this.overlay.style.display = "flex";

    if (this.spinner && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.spinnerAnimation = this.spinner.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        { duration: 700, iterations: Infinity, easing: "linear" },
      );
    }
  }

  private applyTheme(): void {
    if (!this.overlay) {
      return;
    }
    const dark = document.documentElement.dataset.theme === "dark";
    const panel = this.overlay.querySelector<HTMLElement>("[data-grid-loading-panel]");
    const title = this.overlay.querySelector<HTMLElement>("[data-grid-loading-title]");
    const subtitle = this.overlay.querySelector<HTMLElement>("[data-grid-loading-subtitle]");

    this.overlay.style.backgroundColor = dark ? "rgba(13, 32, 45, 0.84)" : "rgba(255, 255, 255, 0.84)";
    if (panel) {
      panel.style.backgroundColor = dark ? "var(--color-brand-dark-surface)" : "var(--color-brand-surface)";
      panel.style.borderColor = dark ? "var(--color-brand-dark-line)" : "var(--color-brand-line)";
    }
    if (title) {
      title.style.color = dark ? "#f1f5f9" : "var(--color-brand-ink)";
    }
    if (subtitle) {
      subtitle.style.color = dark ? "var(--color-brand-dark-muted)" : "var(--color-brand-muted)";
    }
  }
}

const initializedLoadingGrids = new WeakSet<HTMLElement>();
let pageShowReady = false;

function initializePageShowReset(): void {
  if (pageShowReady) {
    return;
  }

  pageShowReady = true;
  window.addEventListener("pageshow", () => {
    document.querySelectorAll<HTMLElement>("[data-grid]").forEach((grid) => {
      grid.removeAttribute("aria-busy");
      grid.querySelectorAll<HTMLElement>("[data-grid-loading]").forEach((overlay) => {
        overlay.style.display = "none";
        overlay.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      });
    });
  });
}

export function initializeDataGridLoading(root: ParentNode = document): void {
  initializePageShowReset();

  root.querySelectorAll<HTMLElement>("[data-grid]").forEach((grid) => {
    if (initializedLoadingGrids.has(grid)) {
      return;
    }

    initializedLoadingGrids.add(grid);
    new DataGridLoadingController(grid).start();
  });
}
