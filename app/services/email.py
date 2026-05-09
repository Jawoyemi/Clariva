import logging
from pathlib import Path

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, HtmlContent, From, To

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    """Load the welcome template and substitute the name placeholder."""
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


def send_welcome_email(email: str, name: str):
    """Send a welcome email via SendGrid's HTTP API (sync for background threadpool)."""
    if not settings.SENDGRID_API_KEY:
        logger.error("SENDGRID_API_KEY is not set. Skipping welcome email.")
        return

    try:
        html_content = _render_welcome_html(name)

        message = Mail(
            from_email=From(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
            to_emails=To(email),
            subject="Welcome to Clariva!",
            html_content=HtmlContent(html_content),
        )

        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code >= 200 and response.status_code < 300:
            logger.info("Welcome email sent to %s (Status: %s)", email, response.status_code)
        else:
            logger.error("SendGrid error for %s: Status %s, Body: %s", email, response.status_code, response.body)
            
    except Exception as e:
        logger.exception("Failed to send welcome email to %s: %s", email, str(e))
