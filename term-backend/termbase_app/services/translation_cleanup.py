"""Conservative, auditable cleanup for legacy translation language metadata."""

from dataclasses import dataclass, field
import re

from ..models import Language, Translation


@dataclass(frozen=True)
class LanguageInference:
    code: str
    name_zh: str
    name_en: str
    cleaned_text: str
    reason: str


@dataclass(frozen=True)
class TranslationCleanupChange:
    translation_id: int
    old_language_code: str
    old_text: str
    new_language_code: str
    new_language_name_zh: str
    new_text: str
    reason: str


@dataclass
class CleanupReport:
    scanned: int = 0
    changed: int = 0
    skipped: int = 0
    applied: bool = False
    changes: list[TranslationCleanupChange] = field(default_factory=list)


LANGUAGES = {
    "fr": ("法语", "French", ("法语", "法文", "french")),
    "es": ("西班牙语", "Spanish", ("西班牙语", "西语", "spanish")),
    "ru": ("俄语", "Russian", ("俄语", "俄文", "russian")),
    "ar": ("阿拉伯语", "Arabic", ("阿拉伯语", "阿语", "arabic")),
    "ja": ("日语", "Japanese", ("日语", "日文", "japanese")),
    "de": ("德语", "German", ("德语", "德文", "german")),
    "ko": ("韩语", "Korean", ("韩语", "韩文", "korean")),
}


def infer_explicit_language(text: str, note: str | None) -> LanguageInference | None:
    """Infer a language only from an explicit label, never from the script itself."""
    value = (text or "").strip()
    annotation = (note or "").strip()
    for code, (name_zh, name_en, labels) in LANGUAGES.items():
        labels_pattern = "|".join(re.escape(label) for label in labels)
        text_match = re.match(
            rf"^\s*(?:{labels_pattern})\s*[：:]\s*(?P<translation>.+?)\s*$",
            value,
            flags=re.IGNORECASE,
        )
        if text_match:
            return LanguageInference(
                code=code,
                name_zh=name_zh,
                name_en=name_en,
                cleaned_text=text_match.group("translation"),
                reason="explicit_text_prefix",
            )
        if re.search(
            rf"(?:语种|语言|language)\s*[：:]\s*(?:{labels_pattern})(?:\s|$|[，,；;])",
            annotation,
            flags=re.IGNORECASE,
        ):
            return LanguageInference(
                code=code,
                name_zh=name_zh,
                name_en=name_en,
                cleaned_text=value,
                reason="explicit_note_label",
            )
    return None


def build_translation_cleanup(session, apply: bool = False) -> CleanupReport:
    """Audit legacy translations and optionally apply only explicit inferences."""
    report = CleanupReport(applied=apply)
    translations = session.query(Translation).order_by(Translation.id).all()
    for translation in translations:
        report.scanned += 1
        if translation.language.code != "und":
            report.skipped += 1
            continue

        inference = infer_explicit_language(translation.text, translation.note)
        if inference is None:
            report.skipped += 1
            continue

        change = TranslationCleanupChange(
            translation_id=translation.id,
            old_language_code=translation.language.code,
            old_text=translation.text,
            new_language_code=inference.code,
            new_language_name_zh=inference.name_zh,
            new_text=inference.cleaned_text,
            reason=inference.reason,
        )
        report.changes.append(change)
        report.changed += 1
        if apply:
            language = session.query(Language).filter_by(code=inference.code).one_or_none()
            if language is None:
                language = Language(
                    code=inference.code,
                    name_zh=inference.name_zh,
                    name_en=inference.name_en,
                )
                session.add(language)
            translation.language = language
            translation.text = inference.cleaned_text

    if apply:
        session.flush()
    return report
