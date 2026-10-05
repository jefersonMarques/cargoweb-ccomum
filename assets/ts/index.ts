import { initializeDataGridControllers } from "./datagrid-controller.js";
import { initializeDataGridLoading } from "./datagrid-loading.js";
import { initializeFormInputs } from "./forms/index.js";

export function initialize(root: ParentNode = document): void {
  initializeDataGridLoading(root);
  initializeDataGridControllers(root);
  void initializeFormInputs(root);
}
