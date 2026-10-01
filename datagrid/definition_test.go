package datagrid

import (
	"net/url"
	"testing"
)

func TestParseAcceptsKnownSortAndFilters(t *testing.T) {
	definition := Definition{
		Key: "users",
		Columns: []Column{
			{Key: "name", Sortable: true, Filterable: true, Filter: FilterText},
			{Key: "status", Sortable: true, Filterable: true, Filter: FilterSelect, Options: []Option{{Value: "active", Label: "Active"}}},
		},
	}

	state := Parse(url.Values{
		"q":        {"maria"},
		"sort":     {"name"},
		"dir":      {"desc"},
		"f_name":   {"silva"},
		"f_status": {"active"},
	}, definition)

	if state.Search != "maria" {
		t.Fatalf("Search = %q", state.Search)
	}
	if state.Sort != "name" || state.Direction != DirectionDescending {
		t.Fatalf("sort = %q %q", state.Sort, state.Direction)
	}
	if state.FilterValue("name") != "silva" || state.FilterValue("status") != "active" {
		t.Fatalf("filters = %#v", state.Filters)
	}
}

func TestParseRejectsUnknownSortAndSelectValue(t *testing.T) {
	definition := Definition{
		Key: "users",
		Columns: []Column{
			{Key: "status", Sortable: true, Filterable: true, Filter: FilterSelect, Options: []Option{{Value: "active", Label: "Active"}}},
		},
	}

	state := Parse(url.Values{
		"sort":     {"password"},
		"dir":      {"desc"},
		"f_status": {"anything"},
	}, definition)

	if state.Sort != "" {
		t.Fatalf("Sort = %q", state.Sort)
	}
	if state.HasFilter("status") {
		t.Fatalf("filters = %#v", state.Filters)
	}
}

func TestParseAcceptsAllowedPagination(t *testing.T) {
	definition := Definition{
		DefaultPageSize: 25,
		PageSizes:       []int{10, 25, 50, 100},
	}

	state := Parse(url.Values{
		"page":      {"3"},
		"page_size": {"50"},
	}, definition)

	if state.Page != 3 {
		t.Fatalf("Page = %d", state.Page)
	}
	if state.PageSize != 50 {
		t.Fatalf("PageSize = %d", state.PageSize)
	}
}

func TestParseRejectsUnsupportedPageSize(t *testing.T) {
	definition := Definition{
		DefaultPageSize: 25,
		PageSizes:       []int{10, 25, 50, 100},
	}

	state := Parse(url.Values{
		"page":      {"0"},
		"page_size": {"500"},
	}, definition)

	if state.Page != 1 {
		t.Fatalf("Page = %d", state.Page)
	}
	if state.PageSize != 25 {
		t.Fatalf("PageSize = %d", state.PageSize)
	}
}

func TestPaginationCalculatesRangeAndNavigation(t *testing.T) {
	pagination := NewPagination(2, 25, 61)

	if pagination.PageCount() != 3 {
		t.Fatalf("PageCount = %d", pagination.PageCount())
	}
	if pagination.FirstItem() != 26 || pagination.LastItem() != 50 {
		t.Fatalf("range = %d-%d", pagination.FirstItem(), pagination.LastItem())
	}
	if !pagination.HasPrevious() || !pagination.HasNext() {
		t.Fatalf("navigation = previous %v next %v", pagination.HasPrevious(), pagination.HasNext())
	}
	if pagination.PreviousPage() != 1 || pagination.NextPage() != 3 {
		t.Fatalf("pages = previous %d next %d", pagination.PreviousPage(), pagination.NextPage())
	}
}

func TestPaginationClampsPageAndHandlesEmptyResult(t *testing.T) {
	pagination := NewPagination(99, 25, 61)
	if pagination.Page != 3 {
		t.Fatalf("Page = %d", pagination.Page)
	}
	if pagination.FirstItem() != 51 || pagination.LastItem() != 61 {
		t.Fatalf("range = %d-%d", pagination.FirstItem(), pagination.LastItem())
	}

	empty := NewPagination(4, 25, 0)
	if empty.Page != 1 {
		t.Fatalf("empty Page = %d", empty.Page)
	}
	if empty.FirstItem() != 0 || empty.LastItem() != 0 {
		t.Fatalf("empty range = %d-%d", empty.FirstItem(), empty.LastItem())
	}
	if empty.HasPrevious() || empty.HasNext() {
		t.Fatalf("empty navigation = previous %v next %v", empty.HasPrevious(), empty.HasNext())
	}
}
