package ui

import (
	"net/url"
	"strconv"

	"github.com/jefersonMarques/cargoweb-ccomum/datagrid"
)

type DataGridAction struct {
	Label       string
	Href        string
	Method      string
	CSRFToken   string
	Destructive bool
	Icon        IconRenderer
}

func dataGridURL(path string, state datagrid.State, sort string, direction datagrid.Direction, clearFilter string) string {
	values := dataGridValues(state)
	values.Del("page")
	if sort != "" {
		values.Set("sort", sort)
		values.Set("dir", string(direction))
	}
	if clearFilter != "" {
		values.Del("f_" + clearFilter)
	}
	return dataGridEncodedURL(path, values)
}

func dataGridPageURL(path string, state datagrid.State, page int) string {
	values := dataGridValues(state)
	values.Set("page", strconv.Itoa(page))
	return dataGridEncodedURL(path, values)
}

func dataGridValues(state datagrid.State) url.Values {
	values := url.Values{}
	if state.Search != "" {
		values.Set("q", state.Search)
	}
	if state.Sort != "" {
		values.Set("sort", state.Sort)
		values.Set("dir", string(state.Direction))
	}
	for key, value := range state.Filters {
		if value != "" {
			values.Set("f_"+key, value)
		}
	}
	if state.Page > 1 {
		values.Set("page", strconv.Itoa(state.Page))
	}
	if state.PageSize > 0 {
		values.Set("page_size", strconv.Itoa(state.PageSize))
	}
	return values
}

func dataGridEncodedURL(path string, values url.Values) string {
	if encoded := values.Encode(); encoded != "" {
		return path + "?" + encoded
	}
	return path
}
