"""Resume-to-job matching.

Score = weighted combination of:
  * skill coverage   = matched required skills / required skills   (taxonomy based, transparent)
  * semantic score   = similarity between resume text and job text
                       (Sentence Transformers if enabled, otherwise TF-IDF cosine similarity)

Absence of a skill in a resume is only reported as "missing" when the resume contains enough
readable text to make that claim. Otherwise the skill is "unconfirmed". The score is an estimate;
it never makes a hiring decision.
"""
import logging
import re
from functools import lru_cache

from flask import current_app
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ai.taxonomy import SKILL_VARIANTS

logger = logging.getLogger(__name__)

MIN_RESUME_WORDS = 40
DISCLAIMER = ("This score is an automated estimate to support recruiter review. "
              "It is not a hiring decision and should be read together with the full resume.")


def _build_pattern(variants):
    ordered = sorted(variants, key=len, reverse=True)
    body = "|".join(re.escape(v) for v in ordered)
    return re.compile(rf"(?<![a-z0-9])(?:{body})(?![a-z0-9])")


_PATTERNS = {name: _build_pattern(variants) for name, variants in SKILL_VARIANTS.items()}


def normalize_text(text):
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def extract_skills(text):
    normalized = normalize_text(text)
    return {name for name, pattern in _PATTERNS.items() if pattern.search(normalized)}


@lru_cache(maxsize=2)
def _sentence_model(model_name):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(model_name)


def semantic_similarity(text_a, text_b):
    """Return (score in [0, 1], method name)."""
    if not text_a.strip() or not text_b.strip():
        return 0.0, "none"
    if current_app.config.get("USE_SENTENCE_TRANSFORMERS"):
        try:
            model = _sentence_model(current_app.config["SENTENCE_MODEL_NAME"])
            embeddings = model.encode([text_a, text_b], normalize_embeddings=True)
            return max(0.0, min(1.0, float(embeddings[0] @ embeddings[1]))), "sentence-transformers"
        except Exception:  # model download or memory failure: degrade gracefully
            logger.exception("Sentence Transformer unavailable; falling back to TF-IDF")
    try:
        matrix = TfidfVectorizer(stop_words="english").fit_transform([text_a, text_b])
        score = float(cosine_similarity(matrix[0], matrix[1])[0][0])
        return max(0.0, min(1.0, score)), "tf-idf"
    except ValueError:  # no usable vocabulary after stop-word removal
        return 0.0, "tf-idf"


def compute_match(resume_text, job_title, job_description, required_skills):
    required = {skill.lower() for skill in required_skills} or extract_skills(job_description)
    resume_skills = extract_skills(resume_text)
    matched = sorted(required & resume_skills)
    absent = sorted(required - resume_skills)

    word_count = len(normalize_text(resume_text).split())
    note = None
    if word_count < MIN_RESUME_WORDS:
        missing, unconfirmed = [], absent
        note = "The resume has too little readable text to confirm which skills are absent."
    else:
        missing, unconfirmed = absent, []

    skill_score = len(matched) / len(required) if required else None
    semantic, method = semantic_similarity(resume_text, f"{job_title}\n{job_description}")

    w_skill = current_app.config["MATCH_WEIGHT_SKILL"]
    w_semantic = current_app.config["MATCH_WEIGHT_SEMANTIC"]
    if skill_score is None:
        combined = semantic
    else:
        combined = (w_skill * skill_score + w_semantic * semantic) / ((w_skill + w_semantic) or 1)

    return {
        "score": round(combined * 100),
        "skill_score": None if skill_score is None else round(skill_score * 100),
        "semantic_score": round(semantic * 100),
        "matched_skills": matched,
        "missing_skills": missing,
        "unconfirmed_skills": unconfirmed,
        "required_skill_count": len(required),
        "method": method,
        "weights": {"skill": w_skill, "semantic": w_semantic},
        "note": note,
        "disclaimer": DISCLAIMER,
    }
