from fastapi_mail import FastMail, MessageSchema, MessageType, ConnectionConfig
from app.config import settings
from pydantic import EmailStr
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

TEMPLATE_FOLDER = Path(__file__).parent.parent / "templates" / "email"

MAIL_CONFIG = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    TEMPLATE_FOLDER=TEMPLATE_FOLDER,
)
MAIL_CLIENT = FastMail(MAIL_CONFIG)

async def send_welcome_email(email: EmailStr, name: str):
    try:
        message = MessageSchema(
            subject="Welcome to Clariva!",
            recipients=[email],
            template_body={"name": name},
            subtype=MessageType.html
        )

        await MAIL_CLIENT.send_message(message, template_name="welcome.html")
        logger.info("Welcome email sent successfully to %s", email)
    except Exception:
        logger.exception("Failed to send welcome email to %s", email)
