package integrationapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	internalLoginPath   = "auth/relogincargoweb"
	defaultTimeout      = 10 * time.Second
	expirationClockSkew = 30 * time.Second
	maximumErrorBody    = 4 << 10
)

var (
	ErrInvalidConfig  = errors.New("invalid integration API config")
	ErrAuthentication = errors.New("integration API authentication failed")
)

type Config struct {
	BaseURL string
	OrgID   int64
	UserID  int64
	Timeout time.Duration
}

type HTTPError struct {
	StatusCode int
	Body       string
}

func (err *HTTPError) Error() string {
	if err.Body == "" {
		return fmt.Sprintf("integration API returned HTTP %d", err.StatusCode)
	}
	return fmt.Sprintf("integration API returned HTTP %d: %s", err.StatusCode, err.Body)
}

type Client struct {
	baseURL *url.URL
	http    *http.Client
	orgID   int64
	userID  int64

	mu        sync.Mutex
	token     string
	expiresAt time.Time
	now       func() time.Time
}

func NewInternal(config Config) (*Client, error) {
	baseURL, err := normalizeBaseURL(config.BaseURL)
	if err != nil || config.OrgID <= 0 || config.UserID <= 0 {
		return nil, ErrInvalidConfig
	}

	timeout := config.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}

	return &Client{
		baseURL: baseURL,
		http:    &http.Client{Timeout: timeout},
		orgID:   config.OrgID,
		userID:  config.UserID,
		now:     time.Now,
	}, nil
}

func NewInternalWithHTTPClient(config Config, httpClient *http.Client) (*Client, error) {
	client, err := NewInternal(config)
	if err != nil {
		return nil, err
	}
	if httpClient != nil {
		client.http = httpClient
	}
	return client, nil
}

func (client *Client) Call(ctx context.Context, method string, path string, request any, response any) error {
	method = strings.ToUpper(strings.TrimSpace(method))
	if method == "" {
		return errors.New("integration API method is required")
	}

	endpoint, err := client.resolve(path)
	if err != nil {
		return err
	}

	payload, err := marshalPayload(request)
	if err != nil {
		return err
	}

	token, err := client.accessToken(ctx)
	if err != nil {
		return err
	}

	statusCode, responseBody, err := client.send(ctx, method, endpoint, payload, token)
	if err != nil {
		return err
	}

	if statusCode == http.StatusUnauthorized {
		client.invalidateToken(token)

		token, err = client.accessToken(ctx)
		if err != nil {
			return err
		}

		statusCode, responseBody, err = client.send(ctx, method, endpoint, payload, token)
		if err != nil {
			return err
		}
	}

	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		return newHTTPError(statusCode, responseBody)
	}

	if response == nil || len(responseBody) == 0 {
		return nil
	}
	if err := json.Unmarshal(responseBody, response); err != nil {
		return fmt.Errorf("decode integration API response: %w", err)
	}
	return nil
}

func (client *Client) accessToken(ctx context.Context) (string, error) {
	client.mu.Lock()
	defer client.mu.Unlock()

	if client.tokenValid() {
		return client.token, nil
	}

	endpoint, err := client.resolve(internalLoginPath)
	if err != nil {
		return "", err
	}

	payload, err := json.Marshal(internalLoginRequest{
		OrgID:       client.orgID,
		UserID:      client.userID,
		InternalUse: true,
	})
	if err != nil {
		return "", err
	}

	statusCode, responseBody, err := client.send(ctx, http.MethodPost, endpoint, payload, "")
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrAuthentication, err)
	}
	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("%w: %v", ErrAuthentication, newHTTPError(statusCode, responseBody))
	}

	var response internalLoginResponse
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return "", fmt.Errorf("%w: decode response: %v", ErrAuthentication, err)
	}

	response.Token = strings.TrimSpace(response.Token)
	if response.Token == "" {
		return "", fmt.Errorf("%w: empty token", ErrAuthentication)
	}

	client.token = response.Token
	client.expiresAt = parseExpiration(response.Expiration)
	return client.token, nil
}

func (client *Client) tokenValid() bool {
	if client.token == "" {
		return false
	}
	if client.expiresAt.IsZero() {
		return true
	}
	return client.now().Add(expirationClockSkew).Before(client.expiresAt)
}

func (client *Client) invalidateToken(token string) {
	client.mu.Lock()
	defer client.mu.Unlock()

	if client.token != token {
		return
	}
	client.token = ""
	client.expiresAt = time.Time{}
}

func (client *Client) send(ctx context.Context, method string, endpoint *url.URL, payload []byte, token string) (int, []byte, error) {
	var body io.Reader
	if payload != nil {
		body = bytes.NewReader(payload)
	}

	request, err := http.NewRequestWithContext(ctx, method, endpoint.String(), body)
	if err != nil {
		return 0, nil, err
	}

	request.Header.Set("Accept", "application/json")
	if payload != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}

	response, err := client.http.Do(request)
	if err != nil {
		return 0, nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, maximumErrorBody+1))
	if err != nil {
		return 0, nil, err
	}
	return response.StatusCode, responseBody, nil
}

func (client *Client) resolve(path string) (*url.URL, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return nil, errors.New("integration API path is required")
	}

	reference, err := url.Parse(path)
	if err != nil || reference.IsAbs() || reference.Host != "" {
		return nil, errors.New("integration API path must be relative")
	}

	base := *client.baseURL
	base.Path = strings.TrimRight(base.Path, "/") + "/" + strings.TrimLeft(reference.Path, "/")
	base.RawQuery = reference.RawQuery
	return &base, nil
}

func normalizeBaseURL(value string) (*url.URL, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, ErrInvalidConfig
	}

	baseURL, err := url.Parse(value)
	if err != nil || (baseURL.Scheme != "http" && baseURL.Scheme != "https") || baseURL.Host == "" {
		return nil, ErrInvalidConfig
	}
	baseURL.RawQuery = ""
	baseURL.Fragment = ""
	return baseURL, nil
}

func marshalPayload(value any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("encode integration API request: %w", err)
	}
	return payload, nil
}

func newHTTPError(statusCode int, body []byte) *HTTPError {
	if len(body) > maximumErrorBody {
		body = body[:maximumErrorBody]
	}
	return &HTTPError{
		StatusCode: statusCode,
		Body:       strings.TrimSpace(string(body)),
	}
}

type internalLoginRequest struct {
	OrgID       int64 `json:"orgid"`
	UserID      int64 `json:"userid"`
	InternalUse bool  `json:"uso_interno"`
}

type internalLoginResponse struct {
	Token      string          `json:"token"`
	Expiration json.RawMessage `json:"expiracao"`
}

func parseExpiration(raw json.RawMessage) time.Time {
	if len(raw) == 0 || string(raw) == "null" {
		return time.Time{}
	}

	var numeric json.Number
	if err := json.Unmarshal(raw, &numeric); err == nil {
		if seconds, err := strconv.ParseInt(numeric.String(), 10, 64); err == nil {
			return time.Unix(seconds, 0)
		}
	}

	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return time.Time{}
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}
	}

	for _, layout := range []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed
		}
	}
	if seconds, err := strconv.ParseInt(value, 10, 64); err == nil {
		return time.Unix(seconds, 0)
	}
	return time.Time{}
}
