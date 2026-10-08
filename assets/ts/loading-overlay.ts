type HtmxRequestDetail = {
  elt?: Element;
  xhr?: XMLHttpRequest;
};

type LoadingRequest = {
  title: string;
  description: string;
};

const showDelayMilliseconds = 120;
const activeRequests = new Map<XMLHttpRequest, LoadingRequest>();

let listenersInitialized = false;
let overlay: HTMLDivElement | null = null;
let spinner: HTMLSpanElement | null = null;
let spinnerAnimation: Animation | null = null;
let showTimer: number | null = null;

function requestDetail(event: Event): HtmxRequestDetail {
  return (event as CustomEvent<HtmxRequestDetail>).detail ?? {};
}

function loadingTrigger(event: Event): HTMLElement | null {
  const detail = requestDetail(event);
  const source = detail.elt ?? event.target;
  if (!(source instanceof Element)) {
    return null;
  }
  return source.closest<HTMLElement>("[data-loading-overlay-trigger]");
}

function mountOverlay(): HTMLDivElement {
  const existing = document.querySelector<HTMLDivElement>("[data-loading-overlay]");
  if (existing) {
    overlay = existing;
    spinner = existing.querySelector<HTMLSpanElement>("[data-loading-overlay-spinner]");
    return existing;
  }

  const root = document.createElement("div");
  root.dataset.loadingOverlay = "";
  root.hidden = true;
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "true");
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    cursor: "progress",
    backdropFilter: "blur(2px)",
    boxSizing: "border-box",
  });

  const panel = document.createElement("div");
  panel.dataset.loadingOverlayPanel = "";
  Object.assign(panel.style, {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    width: "min(100%, 380px)",
    padding: "18px 20px",
    borderWidth: "1px",
    borderStyle: "solid",
    boxSizing: "border-box",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.18)",
  });

  const indicator = document.createElement("span");
  indicator.dataset.loadingOverlaySpinner = "";
  indicator.setAttribute("aria-hidden", "true");
  Object.assign(indicator.style, {
    display: "block",
    width: "26px",
    height: "26px",
    flex: "0 0 auto",
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "var(--color-brand-orange)",
    borderRightColor: "transparent",
    borderRadius: "9999px",
    boxSizing: "border-box",
  });

  const copy = document.createElement("span");
  Object.assign(copy.style, {
    display: "grid",
    gap: "4px",
    minWidth: "0",
  });

  const title = document.createElement("strong");
  title.dataset.loadingOverlayTitle = "";
  Object.assign(title.style, {
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: "1.3",
  });

  const description = document.createElement("span");
  description.dataset.loadingOverlayDescription = "";
  Object.assign(description.style, {
    fontSize: "11px",
    lineHeight: "1.45",
  });

  copy.append(title, description);
  panel.append(indicator, copy);
  root.append(panel);
  document.body.append(root);

  overlay = root;
  spinner = indicator;
  applyTheme();
  return root;
}

function applyTheme(): void {
  if (!overlay) {
    return;
  }

  const dark = document.documentElement.dataset.theme === "dark";
  const panel = overlay.querySelector<HTMLElement>("[data-loading-overlay-panel]");
  const title = overlay.querySelector<HTMLElement>("[data-loading-overlay-title]");
  const description = overlay.querySelector<HTMLElement>("[data-loading-overlay-description]");

  overlay.style.backgroundColor = dark ? "rgba(13, 32, 45, 0.74)" : "rgba(255, 255, 255, 0.74)";
  if (panel) {
    panel.style.backgroundColor = dark ? "var(--color-brand-dark-surface)" : "var(--color-brand-surface)";
    panel.style.borderColor = dark ? "var(--color-brand-dark-line)" : "var(--color-brand-line)";
  }
  if (title) {
    title.style.color = dark ? "#f1f5f9" : "var(--color-brand-ink)";
  }
  if (description) {
    description.style.color = dark ? "var(--color-brand-dark-muted)" : "var(--color-brand-muted)";
  }
}

function newestRequest(): LoadingRequest | null {
  let latest: LoadingRequest | null = null;
  for (const request of activeRequests.values()) {
    latest = request;
  }
  return latest;
}

function updateCopy(request: LoadingRequest): void {
  const root = mountOverlay();
  root.querySelector<HTMLElement>("[data-loading-overlay-title]")!.textContent = request.title;
  root.querySelector<HTMLElement>("[data-loading-overlay-description]")!.textContent = request.description;
}

function show(request: LoadingRequest): void {
  updateCopy(request);
  const root = mountOverlay();
  applyTheme();

  root.hidden = false;
  root.style.display = "flex";
  root.setAttribute("aria-hidden", "false");
  document.body.setAttribute("aria-busy", "true");

  if (spinner && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !spinnerAnimation) {
    spinnerAnimation = spinner.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 700, iterations: Infinity, easing: "linear" },
    );
  }
}

function hide(): void {
  if (showTimer !== null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  if (!overlay) {
    document.body.removeAttribute("aria-busy");
    return;
  }

  overlay.hidden = true;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
  document.body.removeAttribute("aria-busy");
  spinnerAnimation?.cancel();
  spinnerAnimation = null;
}

function scheduleShow(): void {
  if (showTimer !== null || activeRequests.size === 0) {
    return;
  }

  showTimer = window.setTimeout(() => {
    showTimer = null;
    const request = newestRequest();
    if (request) {
      show(request);
    }
  }, showDelayMilliseconds);
}

function beginRequest(event: Event): void {
  const detail = requestDetail(event);
  const trigger = loadingTrigger(event);
  if (!trigger || !detail.xhr) {
    return;
  }

  const request: LoadingRequest = {
    title: trigger.dataset.loadingOverlayTitle?.trim() || "Carregando dados",
    description:
      trigger.dataset.loadingOverlayDescription?.trim() ||
      "Aguarde enquanto a solicitação é processada.",
  };

  activeRequests.set(detail.xhr, request);

  if (overlay && !overlay.hidden) {
    updateCopy(request);
    return;
  }
  scheduleShow();
}

function finishRequest(event: Event): void {
  const detail = requestDetail(event);
  if (!detail.xhr || !activeRequests.has(detail.xhr)) {
    return;
  }

  activeRequests.delete(detail.xhr);
  const request = newestRequest();
  if (request) {
    if (overlay && !overlay.hidden) {
      updateCopy(request);
    }
    return;
  }
  hide();
}

function reset(): void {
  activeRequests.clear();
  hide();
}

export function initializeLoadingOverlay(): void {
  if (listenersInitialized) {
    return;
  }

  listenersInitialized = true;
  document.addEventListener("htmx:beforeRequest", beginRequest);
  document.addEventListener("htmx:afterRequest", finishRequest);
  document.addEventListener("htmx:sendError", finishRequest);
  document.addEventListener("htmx:timeout", finishRequest);
  document.addEventListener("htmx:abort", finishRequest);
  document.addEventListener("htmx:sendAbort", finishRequest);
  window.addEventListener("pageshow", reset);
}
