import { initializeDataGridControllers } from "./datagrid-controller.js";
import { initializeDataGridLoading } from "./datagrid-loading.js";

export function initialize(root: ParentNode = document): void {
  initializeDataGridLoading(root);
  initializeDataGridControllers(root);
}
