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
