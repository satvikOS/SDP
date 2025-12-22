"""RAG (Retrieval Augmented Generation) context builder for Claude."""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from uuid import UUID
import numpy as np
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RetrievalConfig:
    """Configuration for evidence retrieval."""
    top_k: int = 10
    similarity_threshold: float = 0.7
    diversity_factor: float = 0.3
    recency_weight: float = 0.2
    credibility_weight: float = 0.3
    max_context_tokens: int = 100000
    include_contradictory: bool = True


class EvidenceRetriever:
    """Retrieve relevant evidence for RAG context."""

    def __init__(self, vector_store, config: Optional[RetrievalConfig] = None):
        """Initialize retriever."""
        self.vector_store = vector_store
        self.config = config or RetrievalConfig()

    async def retrieve(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        config: Optional[RetrievalConfig] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant evidence based on query."""
        cfg = config or self.config

        # Get embeddings for query
        query_embedding = await self.vector_store.embed_text(query)

        # Retrieve candidates
        candidates = await self.vector_store.search(
            embedding=query_embedding,
            top_k=cfg.top_k * 2,  # Retrieve more for filtering
            filters=filters
        )

        # Re-rank with multiple factors
        scored_candidates = []
        for candidate in candidates:
            # Base similarity score
            sim_score = candidate.get("similarity", 0.5)

            # Recency score (more recent is better)
            days_old = (datetime.now() - candidate["timestamp"]).days
            recency_score = 1.0 / (1.0 + np.log1p(days_old))

            # Credibility score
            credibility_score = candidate.get("credibility", 0.5)

            # Combined score
            final_score = (
                sim_score * (1 - cfg.recency_weight - cfg.credibility_weight) +
                recency_score * cfg.recency_weight +
                credibility_score * cfg.credibility_weight
            )

            scored_candidates.append({
                **candidate,
                "final_score": final_score
            })

        # Sort by final score
        scored_candidates.sort(key=lambda x: x["final_score"], reverse=True)

        # Apply diversity filter to avoid redundant evidence
        if cfg.diversity_factor > 0:
            scored_candidates = self._apply_diversity_filter(
                scored_candidates,
                diversity_factor=cfg.diversity_factor
            )

        # Select top K
        selected = scored_candidates[:cfg.top_k]

        # Include contradictory evidence if requested
        if cfg.include_contradictory:
            # Find evidence with opposing sentiment/stance
            contradictory = self._find_contradictory_evidence(candidates, selected)
            if contradictory:
                selected.append(contradictory[0])  # Add one contrarian view

        logger.info(f"Retrieved {len(selected)} evidence items for query: {query[:50]}...")
        return selected

    def _apply_diversity_filter(
        self,
        candidates: List[Dict[str, Any]],
        diversity_factor: float
    ) -> List[Dict[str, Any]]:
        """Filter for diversity to avoid redundant evidence."""
        selected = []
        selected_embeddings = []

        for candidate in candidates:
            if not selected:
                selected.append(candidate)
                selected_embeddings.append(candidate["embedding"])
                continue

            # Check similarity to already selected
            candidate_emb = candidate["embedding"]
            max_similarity = max([
                self._cosine_similarity(candidate_emb, sel_emb)
                for sel_emb in selected_embeddings
            ])

            # If not too similar to existing, add it
            if max_similarity < (1 - diversity_factor):
                selected.append(candidate)
                selected_embeddings.append(candidate_emb)

        return selected

    def _find_contradictory_evidence(
        self,
        all_candidates: List[Dict[str, Any]],
        selected: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find evidence that contradicts the main narrative."""
        selected_ids = {c["id"] for c in selected}

        # Look for opposite sentiment
        avg_sentiment = np.mean([c.get("sentiment", 0) for c in selected])

        contradictory = []
        for candidate in all_candidates:
            if candidate["id"] in selected_ids:
                continue

            candidate_sentiment = candidate.get("sentiment", 0)
            # Opposite sentiment
            if (avg_sentiment > 0.2 and candidate_sentiment < -0.2) or \
               (avg_sentiment < -0.2 and candidate_sentiment > 0.2):
                contradictory.append(candidate)

        # Sort by credibility and return
        contradictory.sort(key=lambda x: x.get("credibility", 0), reverse=True)
        return contradictory[:2]

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))


class ContextBuilder:
    """Build context bundles for Claude agents."""

    def __init__(self, retriever: EvidenceRetriever):
        """Initialize context builder."""
        self.retriever = retriever

    async def build_signal_context(
        self,
        signals: List[Dict[str, Any]],
        industry: str,
        region: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Build context for signal synthesizer agent."""
        # Retrieve supporting evidence for signals
        evidence_map = {}

        for signal in signals:
            # Build query from signal
            query = f"{signal['title']} {signal['description']}"

            # Retrieve evidence
            evidence = await self.retriever.retrieve(
                query=query,
                filters={
                    "industry": industry,
                    "region": region
                },
                config=RetrievalConfig(top_k=5)
            )

            evidence_map[signal["id"]] = evidence

        # Build formatted context
        context = {
            "signals": self._format_signals(signals),
            "evidence": self._format_evidence_collection(evidence_map),
            "industry": industry,
            "region": region,
            "horizon": horizon
        }

        return context

    async def build_driver_context(
        self,
        themes: List[Dict[str, Any]],
        industry: str,
        region: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Build context for driver extractor agent."""
        # Collect all evidence from themes
        all_evidence = []
        for theme in themes:
            for ev_map in theme.get("evidence_map", []):
                all_evidence.append(ev_map)

        context = {
            "themes": self._format_themes(themes),
            "evidence": self._format_evidence_list(all_evidence),
            "industry": industry,
            "region": region,
            "horizon": horizon
        }

        return context

    async def build_scenario_context(
        self,
        drivers: List[Dict[str, Any]],
        uncertainties: List[Dict[str, Any]],
        industry: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Build context for scenario constructor agent."""
        context = {
            "drivers": self._format_drivers(drivers),
            "uncertainties": self._format_uncertainties(uncertainties),
            "industry": industry,
            "horizon": horizon
        }

        return context

    async def build_narrative_context(
        self,
        scenario: Dict[str, Any],
        drivers: List[Dict[str, Any]],
        evidence: List[Dict[str, Any]],
        industry: str,
        target_year: int
    ) -> Dict[str, Any]:
        """Build context for narrative generator agent."""
        # Retrieve additional evidence specific to scenario
        scenario_query = f"{scenario['title']} {scenario['core_logic']}"

        additional_evidence = await self.retriever.retrieve(
            query=scenario_query,
            config=RetrievalConfig(top_k=10, include_contradictory=False)
        )

        context = {
            "title": scenario["title"],
            "logic": scenario["core_logic"],
            "positions": scenario["uncertainty_positions"],
            "drivers": [d["name"] for d in drivers],
            "evidence": self._format_evidence_list(additional_evidence),
            "quant_assumptions": scenario.get("quant_assumptions", []),
            "industry": industry,
            "target_year": target_year
        }

        return context

    # Formatting helpers
    def _format_signals(self, signals: List[Dict[str, Any]]) -> str:
        """Format signals for prompt."""
        formatted = []
        for signal in signals:
            formatted.append(
                f"[{signal['id']}] {signal['title']}\n"
                f"  Description: {signal['description']}\n"
                f"  Strength: {signal['strength']}, Trajectory: {signal['trajectory']}\n"
            )
        return "\n".join(formatted)

    def _format_evidence_collection(self, evidence_map: Dict[str, List[Dict]]) -> str:
        """Format evidence collection."""
        formatted = []
        for signal_id, evidence_list in evidence_map.items():
            formatted.append(f"\nEvidence for signal {signal_id}:")
            for ev in evidence_list:
                formatted.append(
                    f"  [{ev['id']}] {ev.get('summary', ev['content'][:100])}...\n"
                    f"    Source: {ev['source']['name']}, Date: {ev['timestamp'].strftime('%Y-%m-%d')}\n"
                )
        return "\n".join(formatted)

    def _format_evidence_list(self, evidence: List[Dict[str, Any]]) -> str:
        """Format evidence list."""
        formatted = []
        for ev in evidence:
            formatted.append(
                f"[{ev['id']}] {ev.get('summary', ev.get('content', '')[:150])}...\n"
                f"  Source: {ev.get('source', {}).get('name', 'Unknown')}, "
                f"Date: {ev.get('timestamp', datetime.now()).strftime('%Y-%m-%d')}\n"
                f"  Credibility: {ev.get('credibility', 0.5):.2f}\n"
            )
        return "\n".join(formatted)

    def _format_themes(self, themes: List[Dict[str, Any]]) -> str:
        """Format themes."""
        formatted = []
        for theme in themes:
            formatted.append(
                f"{theme['title']}\n"
                f"  {theme['description']}\n"
                f"  Strength: {theme['strength']:.2f}, Coherence: {theme['coherence']:.2f}\n"
            )
        return "\n".join(formatted)

    def _format_drivers(self, drivers: List[Dict[str, Any]]) -> str:
        """Format drivers."""
        formatted = []
        for driver in drivers:
            formatted.append(
                f"{driver['name']} ({driver['category']})\n"
                f"  {driver['description']}\n"
                f"  Impact: {driver['impact']:.2f}, Uncertainty: {driver['uncertainty']:.2f}\n"
            )
        return "\n".join(formatted)

    def _format_uncertainties(self, uncertainties: List[Dict[str, Any]]) -> str:
        """Format uncertainties."""
        formatted = []
        for unc in uncertainties:
            formatted.append(
                f"{unc['name']} ({unc['axis']})\n"
                f"  {unc['description']}\n"
                f"  Poles: {unc['poles'][0]} ↔ {unc['poles'][1]}\n"
                f"  Rationale: {unc['rationale']}\n"
            )
        return "\n".join(formatted)
