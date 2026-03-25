"""
quiz_sessions/scoring.py

Additions over base version:
  - get_streak_multiplier(streak) → float   (×1.5 at 3, ×2.0 at 5)
  - calculate_score now accepts streak= and double_points= kwargs
    so consumers.py can pass them without breaking the existing call signature.

Never sent to clients during active questions.
"""

DIFFICULTY_MULTIPLIER = {"easy": 1.0, "medium": 1.5, "hard": 2.0}


def get_streak_multiplier(streak: int) -> float:
    """
    Return the score multiplier earned by a consecutive-correct streak.

    streak < 3  → ×1.0  (no bonus)
    streak 3-4  → ×1.5
    streak ≥ 5  → ×2.0
    """
    if streak >= 5:
        return 2.0
    if streak >= 3:
        return 1.5
    return 1.0


def calculate_score(
    base_points: int,
    difficulty: str,
    response_time: float,
    time_limit: int,
    streak: int = 0,
    double_points: bool = False,
) -> int:
    """
    Calculate final points for a correct answer.

    Order of multipliers applied:
      base_points × difficulty × speed_bonus × streak_bonus × double_points

    Args:
        base_points:   Raw question point value.
        difficulty:    "easy" | "medium" | "hard"
        response_time: Seconds the player took to answer.
        time_limit:    Total seconds allowed for the question.
        streak:        Player's current consecutive-correct streak (AFTER this answer).
        double_points: Whether the Double Points power-up was active for this answer.

    Returns:
        Integer score (0 if response_time is invalid).
    """
    if response_time <= 0 or response_time > time_limit:
        return 0

    # Speed bonus: reward fast answers
    if response_time <= 3:
        speed_bonus = 1.20
    elif response_time <= time_limit / 2:
        speed_bonus = 1.10
    else:
        speed_bonus = 1.00

    difficulty_mult = DIFFICULTY_MULTIPLIER.get(difficulty, 1.0)
    streak_mult     = get_streak_multiplier(streak)

    score = int(round(base_points * difficulty_mult * speed_bonus * streak_mult))

    if double_points:
        score *= 2

    return score