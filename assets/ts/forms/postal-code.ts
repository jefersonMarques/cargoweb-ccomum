import type { BehaviorConfig, ValidationResult } from "./types.js"

function digits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8)
}

function formatPostalCode(value: string): string {
  const valueDigits = digits(value)
  if (valueDigits.length <= 5) return valueDigits
  return `${valueDigits.slice(0, 5)}-${valueDigits.slice(5)}`
}

function validatePostalCode(value: string, _required: boolean): ValidationResult {
  const valueDigits = digits(value)
  if (valueDigits.length === 0) return { state: "empty", message: "" }
  if (valueDigits.length < 8) return { state: "pending", message: "Informe os 8 dígitos do CEP." }
  return { state: "valid", message: "CEP válido." }
}

export const behaviorConfig: BehaviorConfig = {
  format: formatPostalCode,
  validate: validatePostalCode,
  inputMode: "numeric",
  maxLength: 9,
  tokenPattern: /[0-9]/,
}
