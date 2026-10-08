package brdoc

import "testing"

func TestDigits(t *testing.T) {
	got := Digits("13.568.487/0001-55")
	if got != "13568487000155" {
		t.Fatalf("Digits() = %q", got)
	}
}

func TestFormatCNPJ(t *testing.T) {
	got := Format("13568487000155")
	if got != "13.568.487/0001-55" {
		t.Fatalf("Format() = %q", got)
	}
}

func TestFormatCPF(t *testing.T) {
	got := Format("12345678901")
	if got != "123.456.789-01" {
		t.Fatalf("Format() = %q", got)
	}
}


func TestIsValidCNPJ(t *testing.T) {
	t.Parallel()

	for _, test := range []struct {
		value string
		valid bool
	}{
		{value: "11.222.333/0001-81", valid: true},
		{value: "11222333000181", valid: true},
		{value: "11.222.333/0001-44", valid: false},
		{value: "11.111.111/1111-11", valid: false},
		{value: "123", valid: false},
	} {
		if got := IsValidCNPJ(test.value); got != test.valid {
			t.Fatalf("IsValidCNPJ(%q) = %v, want %v", test.value, got, test.valid)
		}
	}
}
