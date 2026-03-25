package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

const (
	defaultSessionTimeoutHours = 24
	verificationTokenExpiry    = 1 * time.Hour
)

// OnResetPasswordFunc is a callback invoked when a password reset is requested.
type OnResetPasswordFunc func(ctx context.Context, email, token string) error

// Service holds dependencies for auth HTTP handlers.
type Service struct {
	Pool            *pgxpool.Pool
	Redis           *redis.Client
	Env             *config.Env
	OnResetPassword OnResetPasswordFunc
}

// Routes returns a Chi router with auth endpoints mounted.
func (s *Service) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/sign-up/email", s.handleSignUp)
	r.Post("/sign-in/email", s.handleSignIn)
	r.Post("/sign-out", s.handleSignOut)
	r.Get("/get-session", s.handleGetSession)
	r.Post("/forget-password", s.handleForgetPassword)
	r.Post("/reset-password", s.handleResetPassword)

	return r
}

type signUpRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (s *Service) handleSignUp(w http.ResponseWriter, r *http.Request) {
	var req signUpRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		errors.Validation("Email, password, and name are required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	// Check signup enabled from settings
	settingsEnabled, minPwLen, sessionTimeout := s.loadAuthSettings(ctx)
	if !settingsEnabled {
		errors.Forbidden("Registration is disabled").WriteJSON(w, r.URL.Path)
		return
	}

	if len(req.Password) < minPwLen {
		errors.Validation("Password too short").WriteJSON(w, r.URL.Path)
		return
	}

	// Check if email already exists
	var existingID string
	err := s.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1 LIMIT 1`, req.Email).Scan(&existingID)
	if err == nil {
		errors.Conflict("Email already registered").WriteJSON(w, r.URL.Path)
		return
	}

	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		logger.Error("hash password failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	userID := cuid2.Generate()
	now := time.Now().UTC()

	// Check if this is the first user (auto-admin)
	var userCount int
	_ = s.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&userCount)
	role := "user"
	if userCount == 0 {
		role = "admin"
	}

	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		logger.Error("begin tx failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer tx.Rollback(ctx)

	// Insert user
	_, err = tx.Exec(ctx,
		`INSERT INTO users (id, email, name, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, req.Email, req.Name, role, now, now,
	)
	if err != nil {
		logger.Error("insert user failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	// Insert account (email/password provider)
	accountID := cuid2.Generate()
	_, err = tx.Exec(ctx,
		`INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		accountID, userID, userID, "credential", hashedPassword, now, now,
	)
	if err != nil {
		logger.Error("insert account failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		logger.Error("commit tx failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	// Create session
	token, err := GenerateSessionToken()
	if err != nil {
		logger.Error("generate session token failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	expiresAt := now.Add(time.Duration(sessionTimeout) * time.Hour)
	session, err := CreateSession(ctx, s.Pool, userID, token, expiresAt, r.RemoteAddr, r.UserAgent())
	if err != nil {
		logger.Error("create session failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	s.setSessionCookie(w, token, expiresAt)

	writeJSON(w, http.StatusOK, map[string]any{
		"session": session,
		"user": map[string]any{
			"id":    userID,
			"email": req.Email,
			"name":  req.Name,
			"role":  role,
		},
	})
}

type signInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Service) handleSignIn(w http.ResponseWriter, r *http.Request) {
	var req signInRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Email == "" || req.Password == "" {
		errors.Validation("Email and password are required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	// Get user
	var userID, name, role string
	var image *string
	err := s.Pool.QueryRow(ctx,
		`SELECT id, name, role, image FROM users WHERE email = $1 LIMIT 1`,
		req.Email,
	).Scan(&userID, &name, &role, &image)
	if err != nil {
		errors.Unauthorized("Invalid email or password").WriteJSON(w, r.URL.Path)
		return
	}

	// Get password from accounts table
	var storedHash string
	err = s.Pool.QueryRow(ctx,
		`SELECT password FROM accounts WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
		userID,
	).Scan(&storedHash)
	if err != nil {
		errors.Unauthorized("Invalid email or password").WriteJSON(w, r.URL.Path)
		return
	}

	valid, err := VerifyPassword(req.Password, storedHash)
	if err != nil || !valid {
		errors.Unauthorized("Invalid email or password").WriteJSON(w, r.URL.Path)
		return
	}

	// Load session timeout from settings
	_, _, sessionTimeout := s.loadAuthSettings(ctx)

	token, err := GenerateSessionToken()
	if err != nil {
		logger.Error("generate session token failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(time.Duration(sessionTimeout) * time.Hour)
	session, err := CreateSession(ctx, s.Pool, userID, token, expiresAt, r.RemoteAddr, r.UserAgent())
	if err != nil {
		logger.Error("create session failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	s.setSessionCookie(w, token, expiresAt)

	writeJSON(w, http.StatusOK, map[string]any{
		"session": session,
		"user": map[string]any{
			"id":    userID,
			"email": req.Email,
			"name":  name,
			"role":  role,
			"image": image,
		},
	})
}

func (s *Service) handleSignOut(w http.ResponseWriter, r *http.Request) {
	token := extractSessionToken(r, s.Env.IsProduction())
	if token == "" {
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	ctx := r.Context()
	session, _, err := GetSessionByToken(ctx, s.Pool, token)
	if err == nil && session != nil {
		_ = DeleteSession(ctx, s.Pool, session.ID)
	}

	s.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (s *Service) handleGetSession(w http.ResponseWriter, r *http.Request) {
	token := extractSessionToken(r, s.Env.IsProduction())
	if token == "" {
		errors.Unauthorized().WriteJSON(w, r.URL.Path)
		return
	}

	session, user, err := GetSessionByToken(r.Context(), s.Pool, token)
	if err != nil {
		errors.Unauthorized().WriteJSON(w, r.URL.Path)
		return
	}

	if session.ExpiresAt.Before(time.Now()) {
		errors.Unauthorized("Session expired").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"session": session,
		"user":    user,
	})
}

type forgetPasswordRequest struct {
	Email string `json:"email"`
}

func (s *Service) handleForgetPassword(w http.ResponseWriter, r *http.Request) {
	var req forgetPasswordRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Email == "" {
		errors.Validation("Email is required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	// Always return success to prevent email enumeration
	var userID string
	err := s.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1 LIMIT 1`, req.Email).Scan(&userID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	// Generate verification token
	token, err := GenerateSessionToken()
	if err != nil {
		logger.Error("generate verification token failed", err)
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	verificationID := cuid2.Generate()
	now := time.Now().UTC()
	expiresAt := now.Add(verificationTokenExpiry)

	_, err = s.Pool.Exec(ctx,
		`INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		verificationID, req.Email, token, expiresAt, now, now,
	)
	if err != nil {
		logger.Error("insert verification failed", err)
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
		return
	}

	// Call the reset password callback
	if s.OnResetPassword != nil {
		if err := s.OnResetPassword(ctx, req.Email, token); err != nil {
			logger.Error("on reset password callback failed", err)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

func (s *Service) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		errors.Validation("Token and new password are required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	// Look up the verification record
	var verificationID, email string
	var expiresAt time.Time
	err := s.Pool.QueryRow(ctx,
		`SELECT id, identifier, expires_at FROM verifications WHERE value = $1 LIMIT 1`,
		req.Token,
	).Scan(&verificationID, &email, &expiresAt)
	if err != nil {
		errors.Validation("Invalid or expired token").WriteJSON(w, r.URL.Path)
		return
	}

	if expiresAt.Before(time.Now()) {
		// Clean up expired token
		_, _ = s.Pool.Exec(ctx, `DELETE FROM verifications WHERE id = $1`, verificationID)
		errors.Validation("Token has expired").WriteJSON(w, r.URL.Path)
		return
	}

	// Get user by email
	var userID string
	err = s.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1 LIMIT 1`, email).Scan(&userID)
	if err != nil {
		errors.Validation("Invalid or expired token").WriteJSON(w, r.URL.Path)
		return
	}

	// Hash new password
	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		logger.Error("hash password failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	// Update password
	_, err = s.Pool.Exec(ctx,
		`UPDATE accounts SET password = $1, updated_at = $2 WHERE user_id = $3 AND provider_id = 'credential'`,
		hashedPassword, time.Now().UTC(), userID,
	)
	if err != nil {
		logger.Error("update password failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	// Delete verification record
	_, _ = s.Pool.Exec(ctx, `DELETE FROM verifications WHERE id = $1`, verificationID)

	// Delete all existing sessions for this user
	_ = DeleteUserSessions(ctx, s.Pool, userID)

	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// loadAuthSettings reads signup_enabled, password_min_length, and session_timeout_hours from the settings table.
func (s *Service) loadAuthSettings(ctx context.Context) (signupEnabled bool, passwordMinLength int, sessionTimeoutHours int) {
	signupEnabled = true
	passwordMinLength = 8
	sessionTimeoutHours = defaultSessionTimeoutHours

	rows, err := s.Pool.Query(ctx,
		`SELECT key, value FROM settings WHERE key IN ('signup_enabled', 'password_min_length', 'session_timeout_hours')`,
	)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		switch key {
		case "signup_enabled":
			signupEnabled = value == "true"
		case "password_min_length":
			if n := parseInt(value, 8); n > 0 {
				passwordMinLength = n
			}
		case "session_timeout_hours":
			if n := parseInt(value, defaultSessionTimeoutHours); n > 0 {
				sessionTimeoutHours = n
			}
		}
	}

	return
}

func (s *Service) setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	name := "better-auth.session_token"
	if s.Env.IsProduction() {
		name = "__Secure-better-auth.session_token"
	}

	sameSite := http.SameSiteLaxMode
	if s.Env.IsProduction() {
		sameSite = http.SameSiteNoneMode
	}

	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   s.Env.IsProduction(),
		SameSite: sameSite,
	})
}

func (s *Service) clearSessionCookie(w http.ResponseWriter) {
	name := "better-auth.session_token"
	if s.Env.IsProduction() {
		name = "__Secure-better-auth.session_token"
	}

	sameSite := http.SameSiteLaxMode
	if s.Env.IsProduction() {
		sameSite = http.SameSiteNoneMode
	}

	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.Env.IsProduction(),
		SameSite: sameSite,
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func parseInt(s string, fallback int) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return fallback
		}
		n = n*10 + int(c-'0')
	}
	if n == 0 && s != "0" {
		return fallback
	}
	return n
}
