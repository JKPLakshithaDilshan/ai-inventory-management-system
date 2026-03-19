"""Password reset service logic."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import PasswordResetToken, User
from app.services.email_service import EmailService


GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an account with that email exists, a password reset link has been sent."
)


class PasswordResetService:
    """Encapsulates forgot-password and password reset workflows."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_reset_url(raw_token: str) -> str:
        template = settings.FRONTEND_PASSWORD_RESET_URL
        if "{token}" in template:
            return template.format(token=raw_token)

        separator = "&" if "?" in template else "?"
        return f"{template}{separator}token={raw_token}"

    async def request_password_reset(
        self,
        email: str,
        request_ip: str | None = None,
        request_user_agent: str | None = None,
    ) -> str:
        """Create a reset token and dispatch email if the account exists.

        Returns a generic message in all cases to prevent account enumeration.
        """

        normalized_email = email.strip().lower()

        user_stmt = select(User).where(func.lower(User.email) == normalized_email)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        # Always return generic message regardless of account existence.
        if not user or not user.is_active:
            return GENERIC_FORGOT_PASSWORD_MESSAGE

        now = datetime.now(timezone.utc)

        # Revoke any currently active reset tokens for this user.
        await self.db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .values(used_at=now)
        )

        raw_token = secrets.token_urlsafe(48)
        token_hash = self._hash_token(raw_token)
        expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        token_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            requested_ip=request_ip,
            requested_user_agent=(request_user_agent[:500] if request_user_agent else None),
        )
        self.db.add(token_record)
        await self.db.flush()

        reset_url = self._build_reset_url(raw_token)
        await EmailService.send_password_reset_email(
            to_email=user.email,
            full_name=user.full_name,
            reset_url=reset_url,
            expires_in_minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
        )

        return GENERIC_FORGOT_PASSWORD_MESSAGE

    async def reset_password(self, token: str, new_password: str) -> None:
        """Validate reset token and update password securely."""

        now = datetime.now(timezone.utc)
        token_hash = self._hash_token(token)

        token_stmt = (
            select(PasswordResetToken)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .order_by(PasswordResetToken.created_at.desc())
        )
        token_result = await self.db.execute(token_stmt)
        token_record = token_result.scalars().first()

        if not token_record:
            raise ValueError("Invalid or expired reset token")

        user = await self.db.get(User, token_record.user_id)
        if not user or not user.is_active:
            raise ValueError("Invalid reset request")

        user.hashed_password = get_password_hash(new_password)
        token_record.used_at = now

        # Revoke any additional active reset tokens for the same user.
        await self.db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.id != token_record.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

        self.db.add(user)
        self.db.add(token_record)
        await self.db.flush()
