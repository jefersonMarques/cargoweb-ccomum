package postalcode

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}

func TestViaCEPLookupNormalizesPostalCodeAndMapsAddress(t *testing.T) {
	t.Parallel()

	client := &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			if request.URL.String() != "https://viacep.com.br/ws/83820000/json/" {
				t.Fatalf("request URL = %q", request.URL.String())
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body: io.NopCloser(strings.NewReader(`{
					"cep":"83820-000",
					"logradouro":"Rua Teste",
					"complemento":"lado par",
					"bairro":"Centro",
					"localidade":"Fazenda Rio Grande",
					"uf":"pr",
					"ibge":"4107652"
				}`)),
				Header: make(http.Header),
			}, nil
		}),
	}

	address, err := NewViaCEP(client).Lookup(context.Background(), "83820-000")
	if err != nil {
		t.Fatalf("Lookup() error = %v", err)
	}
	if address.PostalCode != "83820-000" ||
		address.Street != "Rua Teste" ||
		address.Complement != "lado par" ||
		address.Neighborhood != "Centro" ||
		address.City != "Fazenda Rio Grande" ||
		address.State != "PR" ||
		address.IBGE != "4107652" {
		t.Fatalf("address = %#v", address)
	}
}

func TestViaCEPLookupRejectsInvalidPostalCodeWithoutRequest(t *testing.T) {
	t.Parallel()

	called := false
	client := &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			called = true
			return nil, errors.New("unexpected request")
		}),
	}

	_, err := NewViaCEP(client).Lookup(context.Background(), "123")
	if !errors.Is(err, ErrInvalidPostalCode) {
		t.Fatalf("Lookup() error = %v", err)
	}
	if called {
		t.Fatal("provider was called for invalid postal code")
	}
}

func TestViaCEPLookupReturnsNotFound(t *testing.T) {
	t.Parallel()

	client := &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"erro":true}`)),
				Header:     make(http.Header),
			}, nil
		}),
	}

	_, err := NewViaCEP(client).Lookup(context.Background(), "99999999")
	if !errors.Is(err, ErrPostalCodeNotFound) {
		t.Fatalf("Lookup() error = %v", err)
	}
}

func TestViaCEPLookupReturnsProviderUnavailable(t *testing.T) {
	t.Parallel()

	client := &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusServiceUnavailable,
				Body:       io.NopCloser(strings.NewReader("unavailable")),
				Header:     make(http.Header),
			}, nil
		}),
	}

	_, err := NewViaCEP(client).Lookup(context.Background(), "83820000")
	if !errors.Is(err, ErrProviderUnavailable) {
		t.Fatalf("Lookup() error = %v", err)
	}
}
