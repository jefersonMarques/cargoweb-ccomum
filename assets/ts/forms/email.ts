import type { BehaviorConfig, ValidationResult } from "./types.js"

function formatEmail(value: string): string {
  return value.replace(/\s/g, "")
}

function validateEmail(value: string, _required: boolean): ValidationResult {
  if (value === "") return { state: "empty", message: "" }
  if (!value.includes("@")) return { state: "pending", message: "Informe um e-mail completo." }
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  return valid
    ? { state: "valid", message: "E-mail válido." }
    : { state: "invalid", message: "E-mail inválido." }
}

export const behaviorConfig: BehaviorConfig = {
  format: formatEmail,
  validate: validateEmail,
  inputMode: "email",
  maxLength: 160,
}
