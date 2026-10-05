export type InputBehavior = "br-document" | "phone" | "postal-code" | "state" | "email"

export type ValidationState = "empty" | "pending" | "valid" | "invalid"

export type ValidationResult = {
  state: ValidationState
  message: string
}

export type BehaviorConfig = {
  format: (value: string) => string
  validate: (value: string, required: boolean) => ValidationResult
  inputMode?: HTMLInputElement["inputMode"]
  maxLength?: number
  tokenPattern?: RegExp
}
