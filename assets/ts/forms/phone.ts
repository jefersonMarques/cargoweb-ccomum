import type { BehaviorConfig, ValidationResult } from "./types.js"

function digits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11)
}

function formatPhone(value: string): string {
  const valueDigits = digits(value)
  if (valueDigits.length === 0) return ""
  if (valueDigits.length < 3) return `(${valueDigits}`

  const areaCode = valueDigits.slice(0, 2)
  const subscriber = valueDigits.slice(2)
  const prefixLength = subscriber.length > 8 ? 5 : 4
  const prefix = subscriber.slice(0, prefixLength)
  const suffix = subscriber.slice(prefixLength)

  return suffix === "" ? `(${areaCode}) ${prefix}` : `(${areaCode}) ${prefix}-${suffix}`
}

function validatePhone(value: string, _required: boolean): ValidationResult {
  const valueDigits = digits(value)
  if (valueDigits.length === 0) return { state: "empty", message: "" }
  if (valueDigits.length < 10) return { state: "pending", message: "Informe DDD e número completo." }
  if (valueDigits.slice(0, 2) === "00") return { state: "invalid", message: "Telefone inválido." }
  return { state: "valid", message: "Telefone válido." }
}

export const behaviorConfig: BehaviorConfig = {
  format: formatPhone,
  validate: validatePhone,
  inputMode: "tel",
  maxLength: 15,
  tokenPattern: /[0-9]/,
}
