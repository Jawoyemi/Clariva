import logging
from pathlib import Path
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
    Sends a welcome email using Resend.
    """
    if not settings.RESEND_API_KEY:
        logger.error("RESEND_API_KEY is not set. Cannot send welcome email to %s", email)
        return

    html_content = _render_welcome_html(name)

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
    except Exception as e:
        logger.error("Failed to send welcome email to %s via Resend: %s", email, str(e))
