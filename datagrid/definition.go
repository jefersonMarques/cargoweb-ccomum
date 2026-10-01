package datagrid

import (
	"net/url"
	"strconv"
	"strings"
)

type FilterKind string

type Direction string

const (
	FilterText   FilterKind = "text"
	FilterSelect FilterKind = "select"

	DirectionAscending  Direction = "asc"
	DirectionDescending Direction = "desc"
)

type Option struct {
	Value string
	Label string
}

type Column struct {
	Key         string
	Label       string
	Sortable    bool
	Filterable  bool
	Hideable    bool
	Reorderable bool
	Filter      FilterKind
	Options     []Option
}

type Definition struct {
	Key             string
	Columns         []Column
	DefaultPageSize int
	PageSizes       []int
	RequireSearch   bool
	Paginated       bool
}

type State struct {
	Search    string
	Sort      string
	Direction Direction
	Filters   map[string]string
	Page      int
	PageSize  int
}

type Pagination struct {
	Page     int
	PageSize int
	Total    int
}

func Parse(values url.Values, definition Definition) State {
	state := State{
		Search:    strings.TrimSpace(values.Get("q")),
		Filters:   make(map[string]string),
		Direction: DirectionAscending,
		Page:      positiveInt(values.Get("page"), 1),
		PageSize:  definition.defaultPageSize(),
	}

	requestedPageSize := positiveInt(values.Get("page_size"), 0)
	if definition.acceptsPageSize(requestedPageSize) {
		state.PageSize = requestedPageSize
	}

	sortKey := strings.TrimSpace(values.Get("sort"))
	if column, ok := definition.Column(sortKey); ok && column.Sortable {
		state.Sort = sortKey
		if Direction(strings.ToLower(strings.TrimSpace(values.Get("dir")))) == DirectionDescending {
			state.Direction = DirectionDescending
		}
	}

	for _, column := range definition.Columns {
		if !column.Filterable {
			continue
		}

		value := strings.TrimSpace(values.Get("f_" + column.Key))
		if value == "" {
			continue
		}
		if column.Filter == FilterSelect && !column.accepts(value) {
			continue
		}
		state.Filters[column.Key] = value
	}
	return state
}

func NewPagination(page int, pageSize int, total int) Pagination {
	if pageSize <= 0 {
		pageSize = 25
	}
	if total < 0 {
		total = 0
	}
	pagination := Pagination{Page: page, PageSize: pageSize, Total: total}
	if pagination.Page < 1 {
		pagination.Page = 1
	}
	if pagination.Page > pagination.PageCount() {
		pagination.Page = pagination.PageCount()
	}
	return pagination
}

func (definition Definition) Column(key string) (Column, bool) {
	for _, column := range definition.Columns {
		if column.Key == key {
			return column, true
		}
	}
	return Column{}, false
}

func (definition Definition) PageSizeOptions() []int {
	if len(definition.PageSizes) == 0 {
		return []int{definition.defaultPageSize()}
	}
	result := make([]int, 0, len(definition.PageSizes))
	seen := make(map[int]struct{}, len(definition.PageSizes))
	for _, size := range definition.PageSizes {
		if size <= 0 {
			continue
		}
		if _, exists := seen[size]; exists {
			continue
		}
		seen[size] = struct{}{}
		result = append(result, size)
	}
	if len(result) == 0 {
		return []int{definition.defaultPageSize()}
	}
	return result
}

func (definition Definition) defaultPageSize() int {
	if definition.DefaultPageSize > 0 {
		return definition.DefaultPageSize
	}
	for _, size := range definition.PageSizes {
		if size > 0 {
			return size
		}
	}
	return 25
}

func (definition Definition) acceptsPageSize(size int) bool {
	if size <= 0 {
		return false
	}
	for _, allowed := range definition.PageSizeOptions() {
		if allowed == size {
			return true
		}
	}
	return false
}

func (state State) FilterValue(key string) string {
	return state.Filters[key]
}

func (state State) HasFilter(key string) bool {
	return state.FilterValue(key) != ""
}

func (state State) HasActiveFilters() bool {
	return len(state.Filters) > 0
}

func (state State) HasQuery() bool {
	return state.Search != "" || state.HasActiveFilters()
}

func (pagination Pagination) PageCount() int {
	if pagination.Total <= 0 || pagination.PageSize <= 0 {
		return 1
	}
	return (pagination.Total + pagination.PageSize - 1) / pagination.PageSize
}

func (pagination Pagination) FirstItem() int {
	if pagination.Total == 0 {
		return 0
	}
	return (pagination.Page-1)*pagination.PageSize + 1
}

func (pagination Pagination) LastItem() int {
	if pagination.Total == 0 {
		return 0
	}
	last := pagination.Page * pagination.PageSize
	if last > pagination.Total {
		return pagination.Total
	}
	return last
}

func (pagination Pagination) HasPrevious() bool {
	return pagination.Page > 1
}

func (pagination Pagination) HasNext() bool {
	return pagination.Page < pagination.PageCount()
}

func (pagination Pagination) PreviousPage() int {
	if pagination.Page <= 1 {
		return 1
	}
	return pagination.Page - 1
}

func (pagination Pagination) NextPage() int {
	if pagination.Page >= pagination.PageCount() {
		return pagination.PageCount()
	}
	return pagination.Page + 1
}

func (column Column) accepts(value string) bool {
	for _, option := range column.Options {
		if option.Value == value {
			return true
		}
	}
	return false
}

func positiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
