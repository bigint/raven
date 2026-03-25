package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"
)

// Session represents a user session.
type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	IPAddress string    `json:"ipAddress"`
	UserAgent string    `json:"userAgent"`
}

// User represents a user record returned alongside a session.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Image     *string   `json:"image"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// GenerateSessionToken generates a 32-byte random token, base64url encoded.
func GenerateSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// CreateSession inserts a new session into the database.
func CreateSession(ctx context.Context, pool *pgxpool.Pool, userID, token string, expiresAt time.Time, ipAddress, userAgent string) (*Session, error) {
	id, _ := cuid2.CreateId()
	now := time.Now().UTC()

	s := &Session{
		ID:        id,
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	_, err := pool.Exec(ctx,
		`INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		s.ID, s.UserID, s.Token, s.ExpiresAt, s.CreatedAt, s.UpdatedAt, s.IPAddress, s.UserAgent,
	)
	if err != nil {
		return nil, fmt.Errorf("insert session: %w", err)
	}

	return s, nil
}

// GetSessionByToken looks up a session by token and joins with the users table.
func GetSessionByToken(ctx context.Context, pool *pgxpool.Pool, token string) (*Session, *User, error) {
	s := &Session{}
	u := &User{}

	err := pool.QueryRow(ctx,
		`SELECT
			s.id, s.user_id, s.token, s.expires_at, s.created_at, s.updated_at, s.ip_address, s.user_agent,
			u.id, u.email, u.name, u.role, u.image, u.created_at, u.updated_at
		 FROM sessions s
		 JOIN users u ON u.id = s.user_id
		 WHERE s.token = $1
		 LIMIT 1`,
		token,
	).Scan(
		&s.ID, &s.UserID, &s.Token, &s.ExpiresAt, &s.CreatedAt, &s.UpdatedAt, &s.IPAddress, &s.UserAgent,
		&u.ID, &u.Email, &u.Name, &u.Role, &u.Image, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("get session by token: %w", err)
	}

	return s, u, nil
}

// DeleteSession removes a session by ID.
func DeleteSession(ctx context.Context, pool *pgxpool.Pool, sessionID string) error {
	_, err := pool.Exec(ctx, `DELETE FROM sessions WHERE id = $1`, sessionID)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteUserSessions removes all sessions for a user.
func DeleteUserSessions(ctx context.Context, pool *pgxpool.Pool, userID string) error {
	_, err := pool.Exec(ctx, `DELETE FROM sessions WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete user sessions: %w", err)
	}
	return nil
}
