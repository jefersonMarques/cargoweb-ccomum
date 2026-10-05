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
