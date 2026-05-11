import logging
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import resend

from app.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Get the absolute path to the app directory
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = BASE_DIR / "templates" / "email" / "welcome.html"


def _render_welcome_html(name: str) -> str:
    if not TEMPLATE_PATH.exists():
        logger.warning("Email template not found at %s. Using fallback text.", TEMPLATE_PATH)
        return f"<h1>Welcome to Clariva, {name}!</h1><p>We're glad to have you here.</p>"
    
    html = TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name)


VERIFY_TEMPLATE_PATH = BASE_DIR / "templates" / "email" / "verify.html"


RESET_TEMPLATE_PATH = BASE_DIR / "templates" / "email" / "reset_password.html"

def _render_reset_html(name: str, code: str) -> str:
    if not RESET_TEMPLATE_PATH.exists():
        logger.warning("Reset template not found at %s. Using fallback text.", RESET_TEMPLATE_PATH)
        return f"<h1>Reset Your Password</h1><p>Hi {name}, your password reset code is: <strong>{code}</strong>. It expires in 15 minutes.</p>"
    
    html = RESET_TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name).replace("{{code}}", code)

def _render_verify_html(name: str, code: str) -> str:
    if not VERIFY_TEMPLATE_PATH.exists():
        logger.warning("Verification template not found at %s. Using fallback text.", VERIFY_TEMPLATE_PATH)
        return f"<h1>Verify Your Email</h1><p>Hi {name}, your verification code is: <strong>{code}</strong>. It expires in 15 minutes.</p>"
    
    html = VERIFY_TEMPLATE_PATH.read_text(encoding="utf-8")
    return html.replace("{{name}}", name).replace("{{code}}", code)


def send_welcome_email(email: str, name: str):
    html_content = _render_welcome_html(name)

    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>",
                "to": [email],
                "subject": "Welcome to Clariva!",
                "html": html_content,
            }
            logger.info("Attempting to send welcome email to %s via Resend...", email)
            response = resend.Emails.send(params)
            logger.info("Welcome email sent successfully to %s. Response: %s", email, response)
            return
        except Exception as e:
            logger.error("CRITICAL: Failed to send welcome email to %s via Resend: %s", email, str(e))
            

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


def send_verification_email(email: str, name: str, code: str):
    html_content = _render_verify_html(name, code)

    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>",
                "to": [email],
                "subject": f"{code} is your Clariva verification code",
                "html": html_content,
            }
            logger.info("Attempting to send verification email to %s via Resend...", email)
            response = resend.Emails.send(params)
            logger.info("Verification email sent successfully to %s. Response: %s", email, response)
            return
        except Exception as e:
            logger.error("CRITICAL: Failed to send verification email to %s via Resend: %s", email, str(e))

    if settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>"
            msg["To"] = email
            msg["Subject"] = f"{code} is your Clariva verification code"
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                
            logger.info("Verification email sent to %s via SMTP (Fallback)", email)
            return
        except Exception as e:
            logger.error("Failed to send verification email to %s via SMTP fallback: %s", email, str(e))

    logger.error("No valid email service (Resend or SMTP) configured for sending verification email to %s", email)


def send_reset_password_email(email: str, name: str, code: str):
    html_content = _render_reset_html(name, code)

    if settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            params = {
                "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>",
                "to": [email],
                "subject": f"{code} is your Clariva password reset code",
                "html": html_content,
            }
            logger.info("Attempting to send reset email to %s via Resend...", email)
            response = resend.Emails.send(params)
            logger.info("Reset email sent successfully to %s. Response: %s", email, response)
            return
        except Exception as e:
            logger.error("CRITICAL: Failed to send reset email to %s via Resend: %s", email, str(e))

    if settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_EMAIL}>"
            msg["To"] = email
            msg["Subject"] = f"{code} is your Clariva password reset code"
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
                
            logger.info("Reset email sent to %s via SMTP (Fallback)", email)
            return
        except Exception as e:
            logger.error("Failed to send reset email to %s via SMTP fallback: %s", email, str(e))

    logger.error("No valid email service (Resend or SMTP) configured for sending reset email to %s", email)
