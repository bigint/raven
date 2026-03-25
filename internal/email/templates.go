package email

import (
	"bytes"
	"fmt"
	"html/template"
)

const baseStyle = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
.container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.header { background-color: #18181b; padding: 24px 32px; }
.header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
.content { padding: 32px; color: #27272a; line-height: 1.6; }
.content h2 { margin-top: 0; color: #18181b; font-size: 18px; }
.content p { margin: 12px 0; font-size: 14px; }
.btn { display: inline-block; background-color: #18181b; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin: 16px 0; }
.footer { padding: 16px 32px; text-align: center; color: #a1a1aa; font-size: 12px; border-top: 1px solid #f4f4f5; }
.alert-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0; }
.alert-box p { margin: 4px 0; font-size: 14px; color: #991b1b; }
`

const welcomeTpl = `<!DOCTYPE html>
<html>
<head><style>` + baseStyle + `</style></head>
<body>
<div class="container">
  <div class="header"><h1>Raven</h1></div>
  <div class="content">
    <h2>Welcome, {{.Name}}!</h2>
    <p>Your account has been created successfully. You can now access the Raven dashboard to manage your AI gateway.</p>
    {{if .DashboardURL}}<a href="{{.DashboardURL}}" class="btn">Open Dashboard</a>{{end}}
    <p>If you have any questions, feel free to reach out to your administrator.</p>
  </div>
  <div class="footer">Raven AI Gateway</div>
</div>
</body>
</html>`

const invitationTpl = `<!DOCTYPE html>
<html>
<head><style>` + baseStyle + `</style></head>
<body>
<div class="container">
  <div class="header"><h1>Raven</h1></div>
  <div class="content">
    <h2>You've been invited!</h2>
    <p><strong>{{.InviterName}}</strong> has invited you to join <strong>{{.OrgName}}</strong> on Raven.</p>
    <a href="{{.InviteURL}}" class="btn">Accept Invitation</a>
    <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
  </div>
  <div class="footer">Raven AI Gateway</div>
</div>
</body>
</html>`

const passwordResetTpl = `<!DOCTYPE html>
<html>
<head><style>` + baseStyle + `</style></head>
<body>
<div class="container">
  <div class="header"><h1>Raven</h1></div>
  <div class="content">
    <h2>Reset your password</h2>
    <p>We received a request to reset your password. Click the button below to choose a new one.</p>
    <a href="{{.ResetURL}}" class="btn">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  </div>
  <div class="footer">Raven AI Gateway</div>
</div>
</body>
</html>`

const budgetAlertTpl = `<!DOCTYPE html>
<html>
<head><style>` + baseStyle + `</style></head>
<body>
<div class="container">
  <div class="header"><h1>Raven</h1></div>
  <div class="content">
    <h2>Budget Alert</h2>
    <div class="alert-box">
      <p><strong>{{.BudgetName}}</strong> has reached its spending threshold.</p>
      <p>Current usage: ${{printf "%.2f" .CurrentUsage}} / ${{printf "%.2f" .Limit}} ({{printf "%.0f" .ThresholdPct}}% threshold)</p>
    </div>
    <p>Review your budget settings in the Raven dashboard to avoid service interruptions.</p>
  </div>
  <div class="footer">Raven AI Gateway</div>
</div>
</body>
</html>`

var (
	welcomeTemplate       = template.Must(template.New("welcome").Parse(welcomeTpl))
	invitationTemplate    = template.Must(template.New("invitation").Parse(invitationTpl))
	passwordResetTemplate = template.Must(template.New("password_reset").Parse(passwordResetTpl))
	budgetAlertTemplate   = template.Must(template.New("budget_alert").Parse(budgetAlertTpl))
)

// RenderWelcome renders the welcome email template.
func RenderWelcome(name, dashboardURL string) string {
	return render(welcomeTemplate, map[string]string{
		"Name":         name,
		"DashboardURL": dashboardURL,
	})
}

// RenderInvitation renders the invitation email template.
func RenderInvitation(inviterName, orgName, inviteURL string) string {
	return render(invitationTemplate, map[string]string{
		"InviterName": inviterName,
		"OrgName":     orgName,
		"InviteURL":   inviteURL,
	})
}

// RenderPasswordReset renders the password reset email template.
func RenderPasswordReset(resetURL string) string {
	return render(passwordResetTemplate, map[string]string{
		"ResetURL": resetURL,
	})
}

// RenderBudgetAlert renders the budget alert email template.
func RenderBudgetAlert(budgetName string, currentUsage, limit, threshold float64) string {
	return render(budgetAlertTemplate, map[string]any{
		"BudgetName":   budgetName,
		"CurrentUsage": currentUsage,
		"Limit":        limit,
		"ThresholdPct": threshold * 100,
	})
}

func render(t *template.Template, data any) string {
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return fmt.Sprintf("<p>Error rendering template: %s</p>", err)
	}
	return buf.String()
}
