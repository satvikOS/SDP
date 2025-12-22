"""News connector for ingesting news articles."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import httpx

from base import DataConnector
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from shared.models.evidence import Evidence, EvidenceSourceType

logger = logging.getLogger(__name__)


class NewsAPIConnector(DataConnector):
    """Connector for news APIs (e.g., NewsAPI.org or similar)."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize news connector."""
        super().__init__(EvidenceSourceType.NEWS, config)
        self.api_key = config.get("api_key")
        self.api_url = config.get("api_url", "https://newsapi.org/v2/everything")
        self.client: Optional[httpx.AsyncClient] = None

    async def connect(self) -> bool:
        """Establish HTTP client."""
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Connected to news source: {self.source_name}")
        return True

    async def disconnect(self):
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
        logger.info(f"Disconnected from news source: {self.source_name}")

    async def fetch(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Evidence]:
        """Fetch news articles."""
        if not self.client:
            await self.connect()

        # Default to last 24 hours if no date range
        if not from_date:
            from_date = datetime.now() - timedelta(days=1)
        if not to_date:
            to_date = datetime.now()

        # Build query parameters
        params = {
            "apiKey": self.api_key,
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 100
        }

        # Add filters
        if filters:
            if "query" in filters:
                params["q"] = filters["query"]
            if "sources" in filters:
                params["sources"] = ",".join(filters["sources"])
            if "domains" in filters:
                params["domains"] = ",".join(filters["domains"])

        try:
            response = await self.client.get(self.api_url, params=params)
            response.raise_for_status()
            data = response.json()

            articles = data.get("articles", [])
            evidence_list = []

            for article in articles:
                try:
                    evidence = self.create_evidence(
                        content=article.get("content", article.get("description", "")),
                        summary=article.get("title"),
                        url=article.get("url"),
                        timestamp=datetime.fromisoformat(article["publishedAt"].replace("Z", "+00:00")),
                        metadata={
                            "author": article.get("author"),
                            "source_name": article.get("source", {}).get("name"),
                            "url_to_image": article.get("urlToImage")
                        }
                    )
                    evidence_list.append(evidence)
                except Exception as e:
                    logger.warning(f"Failed to parse article: {e}")
                    continue

            logger.info(f"Fetched {len(evidence_list)} news articles from {self.source_name}")
            return evidence_list

        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching news: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching news: {e}", exc_info=True)
            return []


class RSSFeedConnector(DataConnector):
    """Connector for RSS/Atom feeds."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize RSS connector."""
        super().__init__(EvidenceSourceType.NEWS, config)
        self.feed_url = config.get("feed_url")
        self.client: Optional[httpx.AsyncClient] = None

    async def connect(self) -> bool:
        """Establish HTTP client."""
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"Connected to RSS feed: {self.feed_url}")
        return True

    async def disconnect(self):
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()

    async def fetch(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Evidence]:
        """Fetch RSS feed entries."""
        if not self.client:
            await self.connect()

        try:
            import feedparser  # Would need to add to requirements

            response = await self.client.get(self.feed_url)
            response.raise_for_status()

            feed = feedparser.parse(response.text)
            evidence_list = []

            for entry in feed.entries:
                try:
                    # Parse publication date
                    pub_date = datetime.now()
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        import time
                        pub_date = datetime.fromtimestamp(time.mktime(entry.published_parsed))

                    # Filter by date range
                    if from_date and pub_date < from_date:
                        continue
                    if to_date and pub_date > to_date:
                        continue

                    evidence = self.create_evidence(
                        content=entry.get("summary", entry.get("description", "")),
                        summary=entry.get("title"),
                        url=entry.get("link"),
                        timestamp=pub_date,
                        metadata={
                            "feed_url": self.feed_url,
                            "tags": [tag.term for tag in entry.get("tags", [])]
                        }
                    )
                    evidence_list.append(evidence)

                except Exception as e:
                    logger.warning(f"Failed to parse RSS entry: {e}")
                    continue

            logger.info(f"Fetched {len(evidence_list)} items from RSS feed")
            return evidence_list

        except Exception as e:
            logger.error(f"Error fetching RSS feed: {e}", exc_info=True)
            return []
