"""
JWT token handling for authentication
"""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

import jwt
from passlib.context import CryptContext

from ..models.tenant import TokenData, UserRole


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass


class PasswordHandler:
    """Handles password hashing and verification"""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against a hash

        Args:
            plain_password: Plain text password
            hashed_password: Hashed password to verify against

        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)


class JWTHandler:
    """Handles JWT token creation and verification"""

    @staticmethod
    def create_access_token(
        user_id: UUID,
        tenant_id: UUID,
        username: str,
        role: UserRole,
        expires_delta: Optional[timedelta] = None,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a JWT access token

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID
            username: Username
            role: User role
            expires_delta: Optional custom expiration delta
            additional_claims: Optional additional JWT claims

        Returns:
            JWT token string
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode = {
            "sub": str(user_id),
            "user_id": str(user_id),
            "tenant_id": str(tenant_id),
            "username": username,
            "role": role.value if isinstance(role, UserRole) else role,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }

        if additional_claims:
            to_encode.update(additional_claims)

        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def create_refresh_token(
        user_id: UUID,
        tenant_id: UUID,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT refresh token

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID
            expires_delta: Optional custom expiration delta

        Returns:
            JWT refresh token string
        """
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode = {
            "sub": str(user_id),
            "user_id": str(user_id),
            "tenant_id": str(tenant_id),
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }

        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> TokenData:
        """
        Verify and decode a JWT token

        Args:
            token: JWT token string
            token_type: Type of token to verify ("access" or "refresh")

        Returns:
            TokenData object with decoded claims

        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

            # Verify token type
            if payload.get("type") != token_type:
                raise AuthenticationError(f"Invalid token type. Expected {token_type}")

            # Extract required fields
            user_id = UUID(payload.get("user_id"))
            tenant_id = UUID(payload.get("tenant_id"))
            username = payload.get("username", "")
            role = UserRole(payload.get("role", "viewer"))
            exp = datetime.fromtimestamp(payload.get("exp"))

            return TokenData(
                user_id=user_id,
                tenant_id=tenant_id,
                username=username,
                role=role,
                exp=exp
            )

        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
        except (KeyError, ValueError) as e:
            raise AuthenticationError(f"Malformed token: {str(e)}")

    @staticmethod
    def decode_token_without_verification(token: str) -> Dict[str, Any]:
        """
        Decode a JWT token without verification (for debugging)

        Args:
            token: JWT token string

        Returns:
            Dictionary with decoded claims
        """
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            raise AuthenticationError(f"Failed to decode token: {str(e)}")


class APIKeyHandler:
    """Handles API key generation and hashing"""

    @staticmethod
    def generate_api_key() -> tuple[str, str, str]:
        """
        Generate a new API key

        Returns:
            Tuple of (full_key, key_hash, key_prefix)
        """
        # Generate a random API key
        prefix = "sdp"  # Strategic Decision Platform
        random_part = secrets.token_urlsafe(32)
        full_key = f"{prefix}_{random_part}"

        # Hash the key for storage
        key_hash = pwd_context.hash(full_key)

        # Extract prefix for display (first 10 chars)
        key_prefix = full_key[:10]

        return full_key, key_hash, key_prefix

    @staticmethod
    def verify_api_key(api_key: str, key_hash: str) -> bool:
        """
        Verify an API key against its hash

        Args:
            api_key: The API key to verify
            key_hash: The stored hash to verify against

        Returns:
            True if valid, False otherwise
        """
        return pwd_context.verify(api_key, key_hash)


# Convenience functions
def hash_password(password: str) -> str:
    """Hash a password"""
    return PasswordHandler.hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    return PasswordHandler.verify_password(plain_password, hashed_password)


def create_access_token(
    user_id: UUID,
    tenant_id: UUID,
    username: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create an access token"""
    return JWTHandler.create_access_token(user_id, tenant_id, username, role, expires_delta)


def create_refresh_token(
    user_id: UUID,
    tenant_id: UUID,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a refresh token"""
    return JWTHandler.create_refresh_token(user_id, tenant_id, expires_delta)


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify a token"""
    return JWTHandler.verify_token(token, token_type)


def generate_api_key() -> tuple[str, str, str]:
    """Generate an API key"""
    return APIKeyHandler.generate_api_key()


def verify_api_key(api_key: str, key_hash: str) -> bool:
    """Verify an API key"""
    return APIKeyHandler.verify_api_key(api_key, key_hash)
