import { formatInput } from "./cursor.js"
import type { BehaviorConfig } from "./types.js"

const feedbackDuration = 3000
const feedbackTimers = new WeakMap<HTMLInputElement, number>()
const initializedInputs = new WeakSet<HTMLInputElement>()
let feedbackSequence = 0

function feedbackFor(input: HTMLInputElement): HTMLElement {
  const field = input.closest<HTMLElement>("[data-form-field]")
  const existing = field?.querySelector<HTMLElement>("[data-input-feedback]")
  if (existing) return existing

  feedbackSequence += 1
  const feedback = document.createElement("span")
  feedback.id = `input-feedback-${feedbackSequence}`
  feedback.dataset.inputFeedback = "true"
  feedback.dataset.visible = "false"
  feedback.setAttribute("aria-live", "polite")
  feedback.setAttribute("aria-hidden", "true")

  const badge = document.createElement("span")
  badge.dataset.inputFeedbackBadge = "true"
  feedback.append(badge)

  const shell = input.closest<HTMLElement>("[data-form-input-shell]")
  if (shell) {
    shell.insertAdjacentElement("afterend", feedback)
  } else {
    input.insertAdjacentElement("afterend", feedback)
  }

  const describedBy = new Set((input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean))
  describedBy.add(feedback.id)
  input.setAttribute("aria-describedby", Array.from(describedBy).join(" "))
  return feedback
}

function clearFeedbackTimer(input: HTMLInputElement): void {
  const timer = feedbackTimers.get(input)
  if (timer === undefined) return
  window.clearTimeout(timer)
  feedbackTimers.delete(input)
}

function hideFeedback(input: HTMLInputElement, feedback: HTMLElement): void {
  clearFeedbackTimer(input)
  feedback.dataset.visible = "false"
  feedback.setAttribute("aria-hidden", "true")
}

function showFeedback(input: HTMLInputElement, feedback: HTMLElement): void {
  clearFeedbackTimer(input)
  feedback.dataset.visible = "true"
  feedback.setAttribute("aria-hidden", "false")
  const timer = window.setTimeout(() => hideFeedback(input, feedback), feedbackDuration)
  feedbackTimers.set(input, timer)
}

function applyValidation(input: HTMLInputElement, config: BehaviorConfig, announce: boolean, forceFeedback = false): void {
  const result = config.validate(input.value, input.required)
  const feedback = feedbackFor(input)
  const badge = feedback.querySelector<HTMLElement>("[data-input-feedback-badge]")
  const signature = `${result.state}:${result.message}`
  const changed = input.dataset.inputFeedbackSignature !== signature

  input.dataset.inputState = result.state
  input.setAttribute("aria-invalid", result.state === "invalid" ? "true" : "false")

  const blocksSubmit = result.state === "invalid" || result.state === "pending"
  input.setCustomValidity(blocksSubmit ? result.message : "")

  feedback.dataset.inputState = result.state
  if (badge) badge.textContent = result.message
  input.dataset.inputFeedbackSignature = signature

  if (result.message === "" || !announce) {
    hideFeedback(input, feedback)
    return
  }
  if (changed || forceFeedback) {
    showFeedback(input, feedback)
  }
}

export function initializeInput(input: HTMLInputElement, config: BehaviorConfig): void {
  if (initializedInputs.has(input)) return

  initializedInputs.add(input)
  if (config.inputMode) input.inputMode = config.inputMode
  if (config.maxLength) input.maxLength = config.maxLength

  formatInput(input, config)
  applyValidation(input, config, false)

  input.addEventListener("input", () => {
    formatInput(input, config)
    applyValidation(input, config, true)
  })

  input.addEventListener("blur", () => {
    const formatted = config.format(input.value.trim())
    if (formatted !== input.value) input.value = formatted
    applyValidation(input, config, true, true)
  })
}
