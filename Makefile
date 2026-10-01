.PHONY: generate tidy test vet

generate:
	go run github.com/a-h/templ/cmd/templ@v0.3.1020 generate

tidy:
	go mod tidy

test: generate
	go test ./...

vet: generate
	go vet ./...
