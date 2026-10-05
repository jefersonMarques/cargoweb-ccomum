import { initializeDataGridControllers } from "./datagrid-controller.js";
import { initializeDataGridLoading } from "./datagrid-loading.js";
import { initializeFormInputs } from "./forms/index.js";

export async function initialize(root: ParentNode = document): Promise<void> {
  initializeDataGridLoading(root);
  initializeDataGridControllers(root);
  await initializeFormInputs(root);
}
