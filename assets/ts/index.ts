import { initializeDataGridControllers } from "./datagrid-controller.js";
import { initializeDataGridLoading } from "./datagrid-loading.js";
import { initializeFormInputs } from "./forms/index.js";
import { initializeLoadingOverlay } from "./loading-overlay.js";

export async function initialize(root: ParentNode = document): Promise<void> {
  initializeLoadingOverlay();
  initializeDataGridLoading(root);
  initializeDataGridControllers(root);
  await initializeFormInputs(root);
}
