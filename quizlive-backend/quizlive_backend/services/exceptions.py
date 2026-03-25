"""Custom application exception classes."""


class QuizLiveError(Exception):
    """Base exception."""


class GameNotFoundError(QuizLiveError):
    """Game session not found."""


class GameStateError(QuizLiveError):
    """Invalid state transition."""


class AnswerAlreadySubmittedError(QuizLiveError):
    """Player already answered this question."""


class UnauthorizedActionError(QuizLiveError):
    """User not permitted to perform this action."""


class RateLimitExceededError(QuizLiveError):
    """Rate limit hit."""
