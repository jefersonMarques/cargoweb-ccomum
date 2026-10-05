import type { BehaviorConfig } from "./types.js"

function countTokens(value: string, end: number, pattern: RegExp): number {
  let count = 0
  for (const current of value.slice(0, end)) {
    if (pattern.test(current)) count += 1
  }
  return count
}

function positionAfterTokens(value: string, tokenCount: number, pattern: RegExp): number {
  if (tokenCount <= 0) return 0
  let count = 0
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index]
    if (current !== undefined && pattern.test(current)) {
      count += 1
      if (count === tokenCount) return index + 1
    }
  }
  return value.length
}

export function formatInput(input: HTMLInputElement, config: BehaviorConfig): void {
  const previous = input.value
  const selectionStart = input.selectionStart
  const tokenCount = selectionStart !== null && config.tokenPattern
    ? countTokens(previous, selectionStart, config.tokenPattern)
    : null

  const formatted = config.format(previous)
  if (formatted === previous) return
  input.value = formatted

  if (tokenCount !== null && config.tokenPattern && document.activeElement === input) {
    const position = positionAfterTokens(formatted, tokenCount, config.tokenPattern)
    input.setSelectionRange(position, position)
  }
}
