import type { BehaviorConfig, ValidationResult } from "./types.js"

function digits(value: string, maximum: number): string {
  return value.replace(/\D/g, "").slice(0, maximum)
}

function formatCPF(value: string): string {
  const valueDigits = digits(value, 11)
  if (valueDigits.length <= 3) return valueDigits
  if (valueDigits.length <= 6) return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3)}`
  if (valueDigits.length <= 9) return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6)}`
  return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6, 9)}-${valueDigits.slice(9)}`
}

function formatCNPJ(value: string): string {
  const valueDigits = digits(value, 14)
  if (valueDigits.length <= 2) return valueDigits
  if (valueDigits.length <= 5) return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2)}`
  if (valueDigits.length <= 8) return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5)}`
  if (valueDigits.length <= 12) return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5, 8)}/${valueDigits.slice(8)}`
  return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5, 8)}/${valueDigits.slice(8, 12)}-${valueDigits.slice(12)}`
}

function formatBrazilianDocument(value: string): string {
  const valueDigits = digits(value, 14)
  return valueDigits.length <= 11 ? formatCPF(valueDigits) : formatCNPJ(valueDigits)
}

function repeatedDigits(value: string): boolean {
  return /^([0-9])\1+$/.test(value)
}

function isValidCPF(value: string): boolean {
  const valueDigits = digits(value, 11)
  if (valueDigits.length !== 11 || repeatedDigits(valueDigits)) return false

  let firstSum = 0
  for (let index = 0; index < 9; index += 1) {
    const current = Number(valueDigits[index])
    firstSum += current * (10 - index)
  }
  const firstRemainder = (firstSum * 10) % 11
  const firstDigit = firstRemainder === 10 ? 0 : firstRemainder
  if (firstDigit !== Number(valueDigits[9])) return false

  let secondSum = 0
  for (let index = 0; index < 10; index += 1) {
    const current = Number(valueDigits[index])
    secondSum += current * (11 - index)
  }
  const secondRemainder = (secondSum * 10) % 11
  const secondDigit = secondRemainder === 10 ? 0 : secondRemainder
  return secondDigit === Number(valueDigits[10])
}

function cnpjCheckDigit(value: string, weights: readonly number[]): number {
  let sum = 0
  for (let index = 0; index < weights.length; index += 1) {
    const current = Number(value[index])
    const weight = weights[index]
    if (weight === undefined) return -1
    sum += current * weight
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function isValidCNPJ(value: string): boolean {
  const valueDigits = digits(value, 14)
  if (valueDigits.length !== 14 || repeatedDigits(valueDigits)) return false

  const firstDigit = cnpjCheckDigit(valueDigits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (firstDigit !== Number(valueDigits[12])) return false

  const secondDigit = cnpjCheckDigit(valueDigits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return secondDigit === Number(valueDigits[13])
}

function validateBrazilianDocument(value: string, _required: boolean): ValidationResult {
  const valueDigits = digits(value, 14)
  if (valueDigits.length === 0) return { state: "empty", message: "" }
  if (valueDigits.length < 11) return { state: "pending", message: "Continue digitando o CPF ou CNPJ." }
  if (valueDigits.length === 11) {
    return isValidCPF(valueDigits)
      ? { state: "valid", message: "CPF válido." }
      : { state: "invalid", message: "CPF inválido." }
  }
  if (valueDigits.length < 14) return { state: "pending", message: "Continue digitando o CNPJ." }
  return isValidCNPJ(valueDigits)
    ? { state: "valid", message: "CNPJ válido." }
    : { state: "invalid", message: "CNPJ inválido." }
}

export const behaviorConfig: BehaviorConfig = {
  format: formatBrazilianDocument,
  validate: validateBrazilianDocument,
  inputMode: "numeric",
  maxLength: 18,
  tokenPattern: /[0-9]/,
}
