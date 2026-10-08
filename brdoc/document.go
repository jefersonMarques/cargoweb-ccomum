package brdoc

import "strings"

func Digits(value string) string {
	var builder strings.Builder
	builder.Grow(len(value))
	for _, current := range value {
		if current >= '0' && current <= '9' {
			builder.WriteRune(current)
		}
	}
	return builder.String()
}

func Format(value string) string {
	digits := Digits(value)
	switch len(digits) {
	case 11:
		return digits[0:3] + "." + digits[3:6] + "." + digits[6:9] + "-" + digits[9:11]
	case 14:
		return digits[0:2] + "." + digits[2:5] + "." + digits[5:8] + "/" + digits[8:12] + "-" + digits[12:14]
	default:
		return value
	}
}


func IsValidCNPJ(value string) bool {
	digits := Digits(value)
	if len(digits) != 14 || repeatedDigits(digits) {
		return false
	}

	firstDigit := cnpjCheckDigit(digits[:12], []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2})
	if firstDigit != int(digits[12]-'0') {
		return false
	}

	secondDigit := cnpjCheckDigit(digits[:13], []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2})
	return secondDigit == int(digits[13]-'0')
}

func repeatedDigits(value string) bool {
	if value == "" {
		return false
	}
	for index := 1; index < len(value); index++ {
		if value[index] != value[0] {
			return false
		}
	}
	return true
}

func cnpjCheckDigit(value string, weights []int) int {
	if len(value) != len(weights) {
		return -1
	}

	sum := 0
	for index, weight := range weights {
		sum += int(value[index]-'0') * weight
	}
	remainder := sum % 11
	if remainder < 2 {
		return 0
	}
	return 11 - remainder
}
