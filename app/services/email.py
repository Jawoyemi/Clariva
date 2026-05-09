import logging
from pathlib import Path

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, HtmlContent

from app.config import settings

logger = logging.getLogger(__name__)

TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    """Load the welcome template and substitute the name placeholder."""
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


async def send_welcome_email(email: str, name: str):
    """Send a welcome email via SendGrid's HTTP API (no SMTP needed)."""
    try:
        html_content = _render_welcome_html(name)

        message = Mail(
            from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
            to_emails=email,
            subject="Welcome to Clariva!",
            html_content=HtmlContent(html_content),
        )

        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(
            "Welcome email sent to %s (status %s)", email, response.status_code
        )
    except Exception:
        logger.exception("Failed to send welcome email to %s", email)
