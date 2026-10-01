type GridPreferences = {
  order: string[];
  hidden: string[];
};

class DataGridController {
  private readonly root: HTMLElement;
  private readonly key: string;
  private readonly storageKey: string;
  private readonly columnKeys: string[];
  private readonly hideableKeys: Set<string>;
  private readonly reorderableKeys: Set<string>;
  private preferences: GridPreferences;

  constructor(root: HTMLElement) {
    this.root = root;
    this.key = root.dataset.gridKey ?? "grid";
    this.storageKey = `cargoweb:datagrid:${this.key}`;
    this.columnKeys = Array.from(root.querySelectorAll<HTMLElement>("[data-grid-header]"))
      .map((element) => element.getAttribute("data-grid-header") ?? "")
      .filter((value) => value !== "");
    this.hideableKeys = new Set(
      Array.from(root.querySelectorAll<HTMLInputElement>("[data-grid-column-toggle]"))
        .map((element) => element.getAttribute("data-grid-column-toggle") ?? "")
        .filter((value) => value !== ""),
    );
    this.reorderableKeys = new Set(
      Array.from(root.querySelectorAll<HTMLButtonElement>("[data-grid-move]"))
        .map((element) => element.getAttribute("data-grid-column-key") ?? "")
        .filter((value) => value !== ""),
    );
    this.preferences = this.loadPreferences();
  }

  start(): void {
    this.applyPreferences();
    this.bindSorting();
    this.bindVisibility();
    this.bindMovement();
    this.bindMenus();
  }

  private loadPreferences(): GridPreferences {
    const fallback: GridPreferences = { order: [...this.columnKeys], hidden: [] };
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<GridPreferences>;
      const savedOrder = Array.isArray(parsed.order) ? parsed.order.filter((key) => this.columnKeys.includes(key)) : [];
      const missing = this.columnKeys.filter((key) => !savedOrder.includes(key));
      const order = [...savedOrder, ...missing];
      this.columnKeys.forEach((key, index) => {
        if (this.reorderableKeys.has(key)) {
          return;
        }
        const currentIndex = order.indexOf(key);
        if (currentIndex < 0) {
          return;
        }
        order.splice(currentIndex, 1);
        order.splice(Math.min(index, order.length), 0, key);
      });
      const hidden = Array.isArray(parsed.hidden)
        ? parsed.hidden.filter((key) => this.hideableKeys.has(key))
        : [];
      return { order, hidden };
    } catch {
      return fallback;
    }
  }

  private savePreferences(): void {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch {
      return;
    }
  }

  private applyPreferences(): void {
    const headerRow = this.root.querySelector<HTMLElement>("[data-grid-header-row]");
    const actionsHeader = this.root.querySelector<HTMLElement>("[data-grid-actions-header]");
    if (headerRow && actionsHeader) {
      this.preferences.order.forEach((key) => {
        const header = this.root.querySelector<HTMLElement>(`[data-grid-header="${CSS.escape(key)}"]`);
        if (header) {
          headerRow.insertBefore(header, actionsHeader);
        }
      });
    }

    this.root.querySelectorAll<HTMLElement>("[data-grid-row]").forEach((row) => {
      const actionsCell = row.querySelector<HTMLElement>("[data-grid-actions-cell]");
      if (!actionsCell) {
        return;
      }
      this.preferences.order.forEach((key) => {
        const cell = row.querySelector<HTMLElement>(`[data-grid-cell="${CSS.escape(key)}"]`);
        if (cell) {
          row.insertBefore(cell, actionsCell);
        }
      });
    });

    const columnsList = this.root.querySelector<HTMLElement>("[data-grid-columns-list]");
    if (columnsList) {
      this.preferences.order.forEach((key) => {
        const item = this.root.querySelector<HTMLElement>(`[data-grid-column-item="${CSS.escape(key)}"]`);
        if (item) {
          columnsList.append(item);
        }
      });
    }

    this.columnKeys.forEach((key) => {
      const hidden = this.preferences.hidden.includes(key);
      this.root.querySelectorAll<HTMLElement>(`[data-grid-header="${CSS.escape(key)}"], [data-grid-cell="${CSS.escape(key)}"]`).forEach((element) => {
        element.hidden = hidden;
      });
      const toggle = this.root.querySelector<HTMLInputElement>(`[data-grid-column-toggle="${CSS.escape(key)}"]`);
      if (toggle) {
        toggle.checked = !hidden;
      }
    });

    this.syncMovementControls();
  }

  private syncMovementControls(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-grid-move]").forEach((button) => {
      const key = button.getAttribute("data-grid-column-key");
      const direction = button.getAttribute("data-grid-move");
      if (!key || (direction !== "up" && direction !== "down")) {
        button.disabled = true;
        return;
      }
      const index = this.preferences.order.indexOf(key);
      const target = direction === "up" ? index - 1 : index + 1;
      const targetKey = this.preferences.order[target];
      button.disabled = index < 0 || targetKey === undefined || !this.reorderableKeys.has(targetKey);
    });
  }

  private bindSorting(): void {
    const params = new URLSearchParams(window.location.search);
    const currentSort = params.get("sort") ?? "";
    const currentDirection = params.get("dir") === "desc" ? "desc" : "asc";

    this.root.querySelectorAll<HTMLElement>("[data-grid-header]").forEach((header) => {
      if (!header.querySelector("a[href*='sort=']")) {
        return;
      }
      const key = header.getAttribute("data-grid-header");
      const label = header.querySelector<HTMLElement>(":scope > div > span:first-child");
      if (!key || !label) {
        return;
      }

      if (currentSort === key) {
        header.setAttribute("aria-sort", currentDirection === "desc" ? "descending" : "ascending");
      } else {
        header.setAttribute("aria-sort", "none");
      }

      label.tabIndex = 0;
      label.setAttribute("role", "button");
      label.style.cursor = "pointer";
      label.setAttribute("aria-label", `Ordenar por ${label.textContent?.trim() || key}`);

      const sort = (): void => {
        const nextDirection = currentSort === key && currentDirection !== "desc" ? "desc" : "asc";
        const link = header.querySelector<HTMLAnchorElement>(`[data-grid-sort-direction="${nextDirection}"]`);
        link?.click();
      };

      label.addEventListener("click", sort);
      label.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        sort();
      });
    });
  }

  private bindVisibility(): void {
    this.root.querySelectorAll<HTMLInputElement>("[data-grid-column-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-grid-column-toggle");
        if (!key) {
          return;
        }
        this.setHidden(key, !input.checked);
      });
    });
  }

  private setHidden(key: string, hidden: boolean): void {
    if (!this.hideableKeys.has(key)) {
      return;
    }
    const values = new Set(this.preferences.hidden);
    if (hidden) {
      values.add(key);
    } else {
      values.delete(key);
    }
    this.preferences.hidden = Array.from(values);
    this.savePreferences();
    this.applyPreferences();
  }

  private bindMovement(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-grid-move]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-grid-column-key");
        const direction = button.getAttribute("data-grid-move");
        if (!key || (direction !== "up" && direction !== "down")) {
          return;
        }
        const index = this.preferences.order.indexOf(key);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= this.preferences.order.length) {
          return;
        }
        const current = this.preferences.order[index];
        const adjacent = this.preferences.order[target];
        if (current === undefined || adjacent === undefined || !this.reorderableKeys.has(adjacent)) {
          return;
        }
        this.preferences.order[index] = adjacent;
        this.preferences.order[target] = current;
        this.savePreferences();
        this.applyPreferences();
      });
    });
  }

  private bindMenus(): void {
    this.root.querySelectorAll<HTMLDetailsElement>("[data-grid-column-menu], [data-grid-row-menu], [data-grid-columns-menu]").forEach((menu) => {
      menu.addEventListener("toggle", () => {
        if (!menu.open) {
          return;
        }
        this.root.querySelectorAll<HTMLDetailsElement>("[data-grid-column-menu], [data-grid-row-menu], [data-grid-columns-menu]").forEach((other) => {
          if (other !== menu) {
            other.open = false;
          }
        });
      });
    });

  }

  private closeMenus(): void {
    this.root.querySelectorAll<HTMLDetailsElement>("[data-grid-column-menu], [data-grid-row-menu], [data-grid-columns-menu]").forEach((menu) => {
      menu.open = false;
    });
  }
}

const initializedGrids = new WeakSet<HTMLElement>();
let outsideClickReady = false;

function initializeOutsideClick(): void {
  if (outsideClickReady) {
    return;
  }

  outsideClickReady = true;
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    document.querySelectorAll<HTMLElement>("[data-grid]").forEach((root) => {
      if (root.contains(target)) {
        return;
      }

      root.querySelectorAll<HTMLDetailsElement>("[data-grid-column-menu], [data-grid-row-menu], [data-grid-columns-menu]").forEach((menu) => {
        menu.open = false;
      });
    });
  });
}

export function initializeDataGridControllers(root: ParentNode = document): void {
  initializeOutsideClick();

  root.querySelectorAll<HTMLElement>("[data-grid]").forEach((grid) => {
    if (initializedGrids.has(grid)) {
      return;
    }

    initializedGrids.add(grid);
    new DataGridController(grid).start();
  });
}
