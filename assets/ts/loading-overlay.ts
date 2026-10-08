type HtmxRequestDetail = {
  elt?: Element;
  xhr?: XMLHttpRequest;
};

type LoadingRequest = {
  message: string;
};

const showDelayMilliseconds = 120;
const svgNamespace = "http://www.w3.org/2000/svg";
const activeRequests = new Map<XMLHttpRequest, LoadingRequest>();

const viagatePaths = [
  "M140.724 31.8812C143.727 32.5766 145.518 34.5627 147.015 37.165C158.953 57.8796 171.164 78.4444 182.935 99.2548C195.17 120.894 195.241 142.887 183.031 164.546C171.088 185.736 158.69 206.667 146.48 227.71C143.853 232.236 139.975 233.236 135.365 230.596C130.178 227.631 125.038 224.579 119.8 221.715C117.408 220.407 115.484 218.787 114.375 216.281V212.534C114.927 209.519 116.797 207.125 118.282 204.581C129.409 185.511 140.389 166.353 151.554 147.304C154.356 142.52 156.03 137.386 156.009 131.894C155.984 126.248 154.105 121.048 151.24 116.143C139.293 95.6948 127.413 75.2133 115.567 54.7152C114.961 53.6659 114.751 52.5417 114.375 51.4467V47.6993C114.655 45.3718 116.098 43.9228 118.027 42.7819C123.749 39.4009 129.551 36.1574 135.286 32.8014C136.21 32.2601 137.269 32.2851 138.214 31.8812H140.724Z",
  "M226.281 134.828C227.408 134.741 228.679 135.278 229.925 135.986C235.719 139.286 241.538 142.541 247.327 145.845C251.743 148.366 252.815 152.287 250.268 156.629C242.809 169.354 235.325 182.062 227.849 194.779C222.877 203.238 217.821 211.646 212.96 220.163C207.408 229.884 207.302 239.801 212.922 249.48C225.145 270.539 237.558 291.494 249.9 312.482C252.934 317.644 251.968 321.261 246.691 324.261C241.076 327.449 235.473 330.653 229.841 333.803C225.785 336.074 221.631 334.986 219.317 331.049C206.692 309.577 193.778 288.264 181.556 266.572C169.689 245.509 169.778 223.934 181.696 202.892C193.863 181.408 206.637 160.258 219.122 138.945C220.657 136.324 222.78 134.786 226.285 134.828H226.281Z",
] as const;

let listenersInitialized = false;
let overlay: HTMLDivElement | null = null;
let loadingPaths: SVGPathElement[] = [];
let loadingAnimations: Animation[] = [];
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

function createViagateLoadingMark(): SVGSVGElement {
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.dataset.loadingOverlayMark = "";
  svg.id = "viagate-premium";
  svg.setAttribute("aria-label", "Viagate loading contour animation - Bem longo");
  svg.setAttribute("fill", "none");
  svg.setAttribute("height", "36");
  svg.setAttribute("role", "img");
  svg.setAttribute("viewBox", "0 0 366 367");
  svg.setAttribute("width", "36");

  const title = document.createElementNS(svgNamespace, "title");
  title.textContent = "Viagate Loading — Bem longo";
  svg.append(title);

  loadingPaths = viagatePaths.map((definition) => {
    const path = document.createElementNS(svgNamespace, "path");
    path.dataset.loadingOverlayOutline = "";
    path.setAttribute("class", "outline");
    path.setAttribute("d", definition);
    path.setAttribute("pathLength", "100");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#FF8532");
    path.setAttribute("stroke-width", "7");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-dasharray", "78 100");
    path.setAttribute("stroke-dashoffset", "78");
    svg.append(path);
    return path;
  });

  return svg;
}

function mountOverlay(): HTMLDivElement {
  const existing = document.querySelector<HTMLDivElement>("[data-loading-overlay]");
  if (existing) {
    overlay = existing;
    loadingPaths = Array.from(existing.querySelectorAll<SVGPathElement>("[data-loading-overlay-outline]"));
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
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    boxSizing: "border-box",
  });

  const panel = document.createElement("div");
  panel.dataset.loadingOverlayPanel = "";
  Object.assign(panel.style, {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    maxWidth: "min(calc(100vw - 48px), 420px)",
    padding: "10px 14px",
    borderWidth: "1px",
    borderStyle: "solid",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.14)",
  });

  const mark = createViagateLoadingMark();

  const message = document.createElement("strong");
  message.dataset.loadingOverlayMessage = "";
  Object.assign(message.style, {
    minWidth: "0",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "1.35",
  });

  panel.append(mark, message);
  root.append(panel);
  document.body.append(root);

  overlay = root;
  applyTheme();
  return root;
}

function applyTheme(): void {
  if (!overlay) {
    return;
  }

  const dark = document.documentElement.dataset.theme === "dark";
  const panel = overlay.querySelector<HTMLElement>("[data-loading-overlay-panel]");
  const message = overlay.querySelector<HTMLElement>("[data-loading-overlay-message]");

  overlay.style.backgroundColor = "transparent";
  if (panel) {
    panel.style.backgroundColor = dark ? "var(--color-brand-dark-surface)" : "var(--color-brand-surface)";
    panel.style.borderColor = dark ? "var(--color-brand-dark-line)" : "var(--color-brand-line)";
  }
  if (message) {
    message.style.color = dark ? "#f1f5f9" : "var(--color-brand-ink)";
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
  root.querySelector<HTMLElement>("[data-loading-overlay-message]")!.textContent = request.message;
}

function startLoadingAnimation(): void {
  stopLoadingAnimation();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loadingPaths.forEach((path) => path.setAttribute("stroke-dashoffset", "0"));
    return;
  }

  loadingPaths.forEach((path) => path.setAttribute("stroke-dashoffset", "78"));
  loadingAnimations = loadingPaths.map((path) =>
    path.animate(
      [
        { strokeDashoffset: "78", offset: 0 },
        { strokeDashoffset: "78", offset: 0.05 },
        { strokeDashoffset: "-100", offset: 0.43 },
        { strokeDashoffset: "-100", offset: 1 },
      ],
      {
        duration: 1650,
        iterations: Infinity,
        easing: "cubic-bezier(0.35, 0, 0.65, 1)",
      },
    ),
  );
}

function stopLoadingAnimation(): void {
  loadingAnimations.forEach((animation) => animation.cancel());
  loadingAnimations = [];
}

function show(request: LoadingRequest): void {
  updateCopy(request);
  const root = mountOverlay();
  applyTheme();

  root.hidden = false;
  root.style.display = "flex";
  root.setAttribute("aria-hidden", "false");
  document.body.setAttribute("aria-busy", "true");
  startLoadingAnimation();
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
  stopLoadingAnimation();
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
    message:
      trigger.dataset.loadingOverlayMessage?.trim() ||
      trigger.dataset.loadingOverlayTitle?.trim() ||
      "Carregando dados...",
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
