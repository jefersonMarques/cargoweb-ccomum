import type { BehaviorConfig, ValidationResult } from "./types.js"

const brazilianStates = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
])

function formatState(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()
}

function validateState(value: string, _required: boolean): ValidationResult {
  const state = formatState(value)
  if (state === "") return { state: "empty", message: "" }
  if (state.length < 2) return { state: "pending", message: "Informe a UF com 2 letras." }
  return brazilianStates.has(state)
    ? { state: "valid", message: "UF válida." }
    : { state: "invalid", message: "UF inválida." }
}

export const behaviorConfig: BehaviorConfig = {
  format: formatState,
  validate: validateState,
  inputMode: "text",
  maxLength: 2,
  tokenPattern: /[a-zA-Z]/,
}
