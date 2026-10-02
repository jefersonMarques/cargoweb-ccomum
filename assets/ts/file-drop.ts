const initializedDrops = new WeakSet<HTMLElement>();

function describeFiles(files: FileList): string {
	if (files.length === 0) {
		return "Arraste arquivos para esta área ou clique para selecionar.";
	}
	if (files.length === 1) {
		return files[0]?.name ?? "1 arquivo selecionado";
	}
	return `${files.length} arquivos selecionados`;
}

function setFiles(input: HTMLInputElement, files: FileList): void {
	try {
		input.files = files;
		input.dispatchEvent(new Event("change", { bubbles: true }));
	} catch {
		return;
	}
}

export function initializeFileDrops(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>("[data-file-drop]").forEach((drop) => {
		if (initializedDrops.has(drop)) {
			return;
		}

		const input = drop.querySelector<HTMLInputElement>("[data-file-drop-input]");
		const status = drop.querySelector<HTMLElement>("[data-file-drop-status]");
		const target = input?.closest<HTMLLabelElement>("label");

		if (!input || !status || !target) {
			return;
		}

		input.addEventListener("change", () => {
			status.textContent = input.files ? describeFiles(input.files) : "Arraste arquivos para esta área ou clique para selecionar.";
		});

		target.addEventListener("dragover", (event) => {
			event.preventDefault();
			target.dataset.dropActive = "true";
		});

		target.addEventListener("dragleave", () => {
			delete target.dataset.dropActive;
		});

		target.addEventListener("drop", (event) => {
			event.preventDefault();
			delete target.dataset.dropActive;
			if (event.dataTransfer?.files.length) {
				setFiles(input, event.dataTransfer.files);
			}
		});

		initializedDrops.add(drop);
	});
}
