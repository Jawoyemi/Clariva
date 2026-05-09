import logging
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    """Load the welcome template and substitute the name placeholder."""
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


def send_welcome_email(email: str, name: str):
    """Send a welcome email via SMTP (Outlook/Gmail)."""
    if not settings.SMTP_PASSWORD:
        logger.error("SMTP_PASSWORD is not set. Skipping welcome email.")
        return

    try:
        html_content = _render_welcome_html(name)

        # Create message
        msg = MIMEMultipart()
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>"
        msg["To"] = email
        msg["Subject"] = "Welcome to Clariva!"
        msg.attach(MIMEText(html_content, "html"))

        # Send via SMTP
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()  # Secure the connection
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info("Welcome email sent to %s via SMTP (Status: Success)", email)
            
    except Exception as e:
        logger.exception("Failed to send welcome email to %s via SMTP: %s", email, str(e))
