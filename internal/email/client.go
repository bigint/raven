package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// EmailConfig holds configuration for the email sender.
type EmailConfig struct {
	APIKey    string
	FromEmail string
}

type resendRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

// SendEmail sends an email via the Resend API.
func SendEmail(ctx context.Context, config EmailConfig, to, subject, html string) error {
	from := config.FromEmail
	if from == "" {
		from = "Raven <noreply@yoginth.com>"
	}

	payload := resendRequest{
		From:    from,
		To:      to,
		Subject: subject,
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create email request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+config.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("resend API error (status %d): %v", resp.StatusCode, errResp)
	}

	return nil
}
