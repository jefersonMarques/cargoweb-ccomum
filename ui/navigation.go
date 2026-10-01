package ui

import "github.com/a-h/templ"

func moduleNavigationAttributes(href string) templ.Attributes {
	return templ.Attributes{
		"hx-get": href,
		"hx-target": "#module-content",
		"hx-select": "#module-content",
		"hx-swap": "outerHTML show:top",
		"hx-push-url": "true",
		"hx-indicator": "#module-content",
		"hx-sync": "#module-content:replace",
	}
}

func moduleGetFormAttributes(action string) templ.Attributes {
	return templ.Attributes{
		"hx-get": action,
		"hx-target": "#module-content",
		"hx-select": "#module-content",
		"hx-swap": "outerHTML show:top",
		"hx-push-url": "true",
		"hx-indicator": "#module-content",
		"hx-sync": "#module-content:replace",
	}
}

func ModuleNavigationAttributes(href string) templ.Attributes {
	return moduleNavigationAttributes(href)
}

func ModuleGetFormAttributes(action string) templ.Attributes {
	return moduleGetFormAttributes(action)
}
