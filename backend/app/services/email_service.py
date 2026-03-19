"""Email delivery service stubs."""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email sender abstraction.

    This project currently provides a secure logging stub that can be
    replaced with a real SMTP or provider integration later.
    """

    @staticmethod
    async def send_password_reset_email(
        to_email: str,
        full_name: str | None,
        reset_url: str,
        expires_in_minutes: int,
    ) -> None:
        """Send password reset email (stub).

        Intentionally does not return details to callers. Production integrations
        should replace this implementation with real delivery.
        """

        recipient = full_name or to_email

        logger.info("Password reset email stub invoked")
        logger.info("To: %s", to_email)
        logger.info("Recipient: %s", recipient)
        logger.info("Reset URL: %s", reset_url)
        logger.info("Expires in: %s minutes", expires_in_minutes)

        if settings.SMTP_HOST:
            logger.info("SMTP host is configured (%s) but stub delivery is active", settings.SMTP_HOST)
