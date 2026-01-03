"""
Database connection management with tenant context support
"""
import logging
from contextlib import asynccontextmanager, contextmanager
from typing import Optional, AsyncGenerator, Generator
from uuid import UUID

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from .db_config import db_config

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Manages database connections with tenant context"""

    def __init__(self):
        self._engine = None
        self._async_engine = None
        self._session_factory = None
        self._async_session_factory = None

    def get_engine(self):
        """Get or create synchronous database engine"""
        if self._engine is None:
            self._engine = create_engine(
                db_config.database_url,
                pool_size=db_config.DB_POOL_SIZE,
                max_overflow=db_config.DB_MAX_OVERFLOW,
                pool_timeout=db_config.DB_POOL_TIMEOUT,
                pool_recycle=db_config.DB_POOL_RECYCLE,
                pool_pre_ping=True,  # Verify connections before using
                echo=False,  # Set to True for SQL logging
            )
            logger.info("Created synchronous database engine")
        return self._engine

    def get_async_engine(self):
        """Get or create asynchronous database engine"""
        if self._async_engine is None:
            self._async_engine = create_async_engine(
                db_config.async_database_url,
                pool_size=db_config.DB_POOL_SIZE,
                max_overflow=db_config.DB_MAX_OVERFLOW,
                pool_timeout=db_config.DB_POOL_TIMEOUT,
                pool_recycle=db_config.DB_POOL_RECYCLE,
                pool_pre_ping=True,
                echo=False,
            )
            logger.info("Created asynchronous database engine")
        return self._async_engine

    def get_session_factory(self):
        """Get or create session factory"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.get_engine(),
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )
        return self._session_factory

    def get_async_session_factory(self):
        """Get or create async session factory"""
        if self._async_session_factory is None:
            self._async_session_factory = async_sessionmaker(
                bind=self.get_async_engine(),
                class_=AsyncSession,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )
        return self._async_session_factory

    @contextmanager
    def get_session(self, tenant_id: Optional[UUID] = None) -> Generator[Session, None, None]:
        """
        Get a database session with optional tenant context

        Args:
            tenant_id: Optional tenant ID for RLS

        Yields:
            Session: Database session
        """
        session_factory = self.get_session_factory()
        session = session_factory()

        try:
            # Set tenant context if provided and RLS is enabled
            if tenant_id and db_config.ROW_LEVEL_SECURITY_ENABLED:
                session.execute(
                    text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                )
                logger.debug(f"Set tenant context: {tenant_id}")

            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()

    @asynccontextmanager
    async def get_async_session(
        self, tenant_id: Optional[UUID] = None
    ) -> AsyncGenerator[AsyncSession, None]:
        """
        Get an async database session with optional tenant context

        Args:
            tenant_id: Optional tenant ID for RLS

        Yields:
            AsyncSession: Async database session
        """
        async_session_factory = self.get_async_session_factory()
        session = async_session_factory()

        try:
            # Set tenant context if provided and RLS is enabled
            if tenant_id and db_config.ROW_LEVEL_SECURITY_ENABLED:
                await session.execute(
                    text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
                )
                logger.debug(f"Set tenant context: {tenant_id}")

            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Async database session error: {e}")
            raise
        finally:
            await session.close()

    async def close(self):
        """Close all database connections"""
        if self._async_engine:
            await self._async_engine.dispose()
            logger.info("Closed async database engine")
        if self._engine:
            self._engine.dispose()
            logger.info("Closed sync database engine")


# Global database connection instance
db = DatabaseConnection()


# Convenience functions for getting sessions
def get_db_session(tenant_id: Optional[UUID] = None) -> Generator[Session, None, None]:
    """Get a database session (synchronous)"""
    return db.get_session(tenant_id)


async def get_async_db_session(
    tenant_id: Optional[UUID] = None
) -> AsyncGenerator[AsyncSession, None]:
    """Get a database session (asynchronous)"""
    async with db.get_async_session(tenant_id) as session:
        yield session


# Dependency for FastAPI
async def get_db(tenant_id: Optional[UUID] = None) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async with db.get_async_session(tenant_id) as session:
        yield session
