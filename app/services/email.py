import logging
from pathlib import Path
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    """Load the welcome template and substitute the name placeholder."""
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


def send_welcome_email(email: str, name: str):
    """Send a welcome email via Sender.net API."""
    if not settings.EMAIL_API_KEY:
        logger.error("EMAIL_API_KEY is not set. Skipping welcome email.")
        return

    try:
        html_content = _render_welcome_html(name)

        payload = {
            "email": email,
            "subject": "Welcome to Clariva!",
            "from": settings.EMAIL_FROM_EMAIL,
            "from_name": settings.EMAIL_FROM_NAME,
            "html": html_content
        }

        headers = {
            "Authorization": f"Bearer {settings.EMAIL_API_KEY.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        with httpx.Client() as client:
            response = client.post(
                "https://api.sender.net/v2/emails/transactional",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            
        if response.status_code >= 200 and response.status_code < 300:
            logger.info("Welcome email sent to %s via Sender.net (Status: %s)", email, response.status_code)
        else:
            logger.error("Sender.net error for %s: Status %s, Body: %s", email, response.status_code, response.text)
            
    except Exception as e:
        logger.exception("Failed to send welcome email to %s: %s", email, str(e))
