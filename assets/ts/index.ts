import { initializeDataGridControllers } from "./datagrid-controller.js";
import { initializeDataGridLoading } from "./datagrid-loading.js";
import { initializeFileDrops } from "./file-drop.js";

export function initialize(root: ParentNode = document): void {
  initializeDataGridLoading(root);
  initializeDataGridControllers(root);
  initializeFileDrops(root);
}
