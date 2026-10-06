package postalcode

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	viaCEPBaseURL       = "https://viacep.com.br"
	defaultHTTPTimeout  = 3 * time.Second
	maximumResponseSize = 1 << 20
)

var (
	ErrInvalidPostalCode = errors.New("invalid postal code")
	ErrPostalCodeNotFound = errors.New("postal code not found")
	ErrProviderUnavailable = errors.New("postal code provider unavailable")
)

type Address struct {
	PostalCode   string
	Street       string
	Complement   string
	Neighborhood string
	City         string
	State        string
	IBGE         string
}

type Service struct {
	client *http.Client
}

func NewViaCEP(client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: defaultHTTPTimeout}
	}
	return &Service{client: client}
}

func (service *Service) Lookup(ctx context.Context, value string) (Address, error) {
	postalCode := digits(value)
	if len(postalCode) != 8 {
		return Address{}, ErrInvalidPostalCode
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		viaCEPBaseURL+"/ws/"+postalCode+"/json/",
		nil,
	)
	if err != nil {
		return Address{}, err
	}
	request.Header.Set("Accept", "application/json")

	response, err := service.client.Do(request)
	if err != nil {
		return Address{}, fmt.Errorf("%w: %v", ErrProviderUnavailable, err)
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusBadRequest {
		return Address{}, ErrInvalidPostalCode
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return Address{}, fmt.Errorf("%w: status %d", ErrProviderUnavailable, response.StatusCode)
	}

	var payload viaCEPResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, maximumResponseSize)).Decode(&payload); err != nil {
		return Address{}, fmt.Errorf("%w: decode response: %v", ErrProviderUnavailable, err)
	}
	if payload.Error {
		return Address{}, ErrPostalCodeNotFound
	}

	return Address{
		PostalCode:   strings.TrimSpace(payload.PostalCode),
		Street:       strings.TrimSpace(payload.Street),
		Complement:   strings.TrimSpace(payload.Complement),
		Neighborhood: strings.TrimSpace(payload.Neighborhood),
		City:         strings.TrimSpace(payload.City),
		State:        strings.ToUpper(strings.TrimSpace(payload.State)),
		IBGE:         strings.TrimSpace(payload.IBGE),
	}, nil
}

type viaCEPResponse struct {
	PostalCode   string `json:"cep"`
	Street       string `json:"logradouro"`
	Complement   string `json:"complemento"`
	Neighborhood string `json:"bairro"`
	City         string `json:"localidade"`
	State        string `json:"uf"`
	IBGE         string `json:"ibge"`
	Error        bool   `json:"erro"`
}

func digits(value string) string {
	var builder strings.Builder
	builder.Grow(len(value))
	for _, character := range value {
		if character >= '0' && character <= '9' {
			builder.WriteRune(character)
		}
	}
	return builder.String()
}
