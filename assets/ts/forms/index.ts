import { initializeInput } from "./field.js"
import type { BehaviorConfig, InputBehavior } from "./types.js"

type BehaviorModule = {
  behaviorConfig: BehaviorConfig
}

const candidateSelector = [
  'input[data-input-behavior]',
  'input[name="unique_id"]',
  'input[name="phone"]',
  'input[name="postal_code"]',
  'input[name="state"]',
  'input[type="email"]',
].join(',')

const behaviorLoaders: Record<InputBehavior, () => Promise<BehaviorModule>> = {
  "br-document": () => import("./br-document.js"),
  phone: () => import("./phone.js"),
  "postal-code": () => import("./postal-code.js"),
  state: () => import("./state.js"),
  email: () => import("./email.js"),
}

function behaviorFor(input: HTMLInputElement): InputBehavior | null {
  const explicitBehavior = input.dataset.inputBehavior
  if (explicitBehavior && explicitBehavior in behaviorLoaders) return explicitBehavior as InputBehavior

  switch (input.name) {
    case "unique_id":
      return "br-document"
    case "phone":
      return "phone"
    case "postal_code":
      return "postal-code"
    case "state":
      return "state"
    default:
      return input.type === "email" ? "email" : null
  }
}

export async function initializeFormInputs(root: ParentNode = document): Promise<void> {
  const groupedInputs = new Map<InputBehavior, HTMLInputElement[]>()

  root.querySelectorAll<HTMLInputElement>(candidateSelector).forEach((input) => {
    const behavior = behaviorFor(input)
    if (!behavior) return

    const inputs = groupedInputs.get(behavior) ?? []
    inputs.push(input)
    groupedInputs.set(behavior, inputs)
  })

  await Promise.all(Array.from(groupedInputs.entries()).map(async ([behavior, inputs]) => {
    const module = await behaviorLoaders[behavior]()
    inputs.forEach((input) => initializeInput(input, module.behaviorConfig))
  }))
}
