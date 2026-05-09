import logging
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import resend

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    if not TEMPLATE_PATH.exists():
        logger.warning("Email template not found at %s. Using fallback text.", TEMPLATE_PATH)
        return f"<h1>Welcome to Clariva, {name}!</h1><p>We're glad to have you here.</p>"
    
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


def send_welcome_email(email: str, name: str):
    """
    Sends a welcome email using Resend (priority) or SMTP (fallback).
    """
    html_content = _render_welcome_html(name)

    # 1. Try Resend if API key is present
    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>",
                "to": [email],
                "subject": "Welcome to Clariva!",
                "html": html_content,
            }
            resend.Emails.send(params)
            logger.info("Welcome email sent to %s via Resend", email)
            return
        except Exception as e:
            logger.error("Failed to send welcome email to %s via Resend: %s", email, str(e))
            # Fall through to SMTP if Resend fails

    # 2. Try SMTP as fallback
    if settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>"
            msg["To"] = email
            msg["Subject"] = "Welcome to Clariva!"
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                
            logger.info("Welcome email sent to %s via SMTP (Fallback)", email)
            return
        except Exception as e:
            logger.error("Failed to send welcome email to %s via SMTP fallback: %s", email, str(e))

    logger.error("No valid email service (Resend or SMTP) configured for sending welcome email to %s", email)
