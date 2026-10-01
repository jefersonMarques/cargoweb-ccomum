package ui

import "github.com/a-h/templ"

type IconRenderer func(...templ.Attributes) templ.Component

func renderIcon(icon IconRenderer, attributes templ.Attributes) templ.Component {
	return icon(attributes)
}
