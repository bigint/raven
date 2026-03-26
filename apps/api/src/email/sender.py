from email.message import EmailMessage

import aiosmtplib
import resend

from src.email.renderer import render_template


async def send_email(
    to: str,
    subject: str,
    html: str,
    *,
    resend_api_key: str | None = None,
    from_email: str = "Raven <noreply@raven.dev>",
    smtp_host: str | None = None,
    smtp_port: int = 587,
    smtp_user: str | None = None,
    smtp_pass: str | None = None,
    smtp_tls: bool = True,
) -> None:
    if resend_api_key:
        resend.api_key = resend_api_key
        await resend.Emails.send_async(
            {"from": from_email, "to": [to], "subject": subject, "html": html}
        )
    elif smtp_host:
        msg = EmailMessage()
        msg["From"] = from_email
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(html, subtype="html")
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            use_tls=smtp_tls,
        )


async def send_welcome_email(
    to: str, name: str, dashboard_url: str, **email_config: str
) -> None:
    html = render_template("welcome.mjml", name=name, dashboard_url=dashboard_url)
    await send_email(to, "Welcome to Raven", html, **email_config)


async def send_password_reset_email(
    to: str, name: str, reset_url: str, **email_config: str
) -> None:
    html = render_template("password_reset.mjml", name=name, reset_url=reset_url)
    await send_email(to, "Reset your password", html, **email_config)


async def send_budget_alert_email(
    to: str, budget_name: str, usage_pct: float, limit: str, **email_config: str
) -> None:
    html = render_template(
        "budget_alert.mjml",
        budget_name=budget_name,
        usage_pct=usage_pct,
        limit=limit,
    )
    await send_email(to, f"Budget alert: {budget_name}", html, **email_config)


async def send_invitation_email(
    to: str, inviter_name: str, invite_url: str, **email_config: str
) -> None:
    html = render_template(
        "invitation.mjml", inviter_name=inviter_name, invite_url=invite_url
    )
    await send_email(to, "You're invited to Raven", html, **email_config)
