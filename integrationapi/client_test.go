package integrationapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestInternalClientAuthenticatesOnceAndReusesBearer(t *testing.T) {
	t.Parallel()

	var loginCalls atomic.Int32
	var apiCalls atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/integracoes/auth/relogincargoweb":
			loginCalls.Add(1)

			var request internalLoginRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatalf("decode login request: %v", err)
			}
			if request.OrgID != 10 || request.UserID != 20 || !request.InternalUse {
				t.Fatalf("login request = %#v", request)
			}

			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"token":"token-1","expiracao":"2099-01-01T00:00:00Z"}`))

		case "/integracoes/pessoas/v1/cnpj":
			apiCalls.Add(1)
			if got := r.Header.Get("Authorization"); got != "Bearer token-1" {
				t.Fatalf("Authorization = %q", got)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"razao_social":"ViaGate Teste"}`))

		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewInternal(Config{
		BaseURL: server.URL + "/integracoes",
		OrgID:   10,
		UserID:  20,
	})
	if err != nil {
		t.Fatal(err)
	}

	for range 2 {
		var response struct {
			CompanyName string `json:"razao_social"`
		}
		err := client.Call(
			context.Background(),
			http.MethodPost,
			"pessoas/v1/cnpj",
			map[string]string{"cnpj": "11222333000144"},
			&response,
		)
		if err != nil {
			t.Fatalf("Call() error = %v", err)
		}
		if response.CompanyName != "ViaGate Teste" {
			t.Fatalf("response = %#v", response)
		}
	}

	if loginCalls.Load() != 1 {
		t.Fatalf("login calls = %d, want 1", loginCalls.Load())
	}
	if apiCalls.Load() != 2 {
		t.Fatalf("API calls = %d, want 2", apiCalls.Load())
	}
}

func TestInternalClientRenewsTokenOnceAfterUnauthorized(t *testing.T) {
	t.Parallel()

	var loginCalls atomic.Int32
	var apiCalls atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/integracoes/auth/relogincargoweb":
			call := loginCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"token":"token-` + string(rune('0'+call)) + `","expiracao":"2099-01-01T00:00:00Z"}`))

		case "/integracoes/consulta":
			call := apiCalls.Add(1)
			if call == 1 {
				if got := r.Header.Get("Authorization"); got != "Bearer token-1" {
					t.Fatalf("first Authorization = %q", got)
				}
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			if got := r.Header.Get("Authorization"); got != "Bearer token-2" {
				t.Fatalf("second Authorization = %q", got)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"ok":true}`))

		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewInternal(Config{
		BaseURL: server.URL + "/integracoes",
		OrgID:   10,
		UserID:  20,
	})
	if err != nil {
		t.Fatal(err)
	}

	var response struct {
		OK bool `json:"ok"`
	}
	if err := client.Call(context.Background(), http.MethodGet, "consulta", nil, &response); err != nil {
		t.Fatalf("Call() error = %v", err)
	}
	if !response.OK {
		t.Fatalf("response = %#v", response)
	}
	if loginCalls.Load() != 2 {
		t.Fatalf("login calls = %d, want 2", loginCalls.Load())
	}
	if apiCalls.Load() != 2 {
		t.Fatalf("API calls = %d, want 2", apiCalls.Load())
	}
}

func TestInternalClientRejectsInvalidConfigAndAbsoluteCallPath(t *testing.T) {
	t.Parallel()

	if _, err := NewInternal(Config{BaseURL: "dev-integracao.viagate.com.br", OrgID: 1, UserID: 2}); !errors.Is(err, ErrInvalidConfig) {
		t.Fatalf("NewInternal() error = %v", err)
	}

	client, err := NewInternal(Config{
		BaseURL: "https://dev-integracao.viagate.com.br/integracoes",
		OrgID:   1,
		UserID:  2,
	})
	if err != nil {
		t.Fatal(err)
	}

	err = client.Call(context.Background(), http.MethodGet, "https://example.com/escape", nil, nil)
	if err == nil {
		t.Fatal("Call() accepted an absolute URL")
	}
}

func TestInternalClientReturnsHTTPError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/integracoes/auth/relogincargoweb":
			_, _ = w.Write([]byte(`{"token":"token-1","expiracao":"2099-01-01T00:00:00Z"}`))
		case "/integracoes/falha":
			http.Error(w, "indisponível", http.StatusBadGateway)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewInternal(Config{
		BaseURL: server.URL + "/integracoes",
		OrgID:   1,
		UserID:  2,
		Timeout: time.Second,
	})
	if err != nil {
		t.Fatal(err)
	}

	err = client.Call(context.Background(), http.MethodGet, "falha", nil, nil)
	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("Call() error = %v", err)
	}
	if httpErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("status = %d", httpErr.StatusCode)
	}
}
