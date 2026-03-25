"""Views for quiz and question CRUD — teacher only."""
import csv
import io

from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsOwner, IsTeacher
from .models import AnswerOption, Question, Quiz
from .serializers import (
    AnswerOptionSerializer,
    QuestionSerializer,
    QuizListSerializer,
    QuizSerializer,
)


# ─── Existing views (unchanged) ───────────────────────────────────────────────

class QuizListCreateView(generics.ListCreateAPIView):
    """GET /quizzes/ — list teacher's quizzes. POST — create quiz."""
    permission_classes = [IsTeacher]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return QuizListSerializer
        return QuizSerializer

    def get_queryset(self):
        return Quiz.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /quizzes/{id}/"""
    serializer_class = QuizSerializer
    permission_classes = [IsTeacher, IsOwner]

    def get_queryset(self):
        return Quiz.objects.filter(owner=self.request.user).prefetch_related(
            "questions", "questions__options"
        )


class QuestionListCreateView(generics.ListCreateAPIView):
    """POST /quizzes/{quiz_id}/questions/ — add question to quiz."""
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Question.objects.filter(
            quiz__id=self.kwargs["quiz_id"],
            quiz__owner=self.request.user,
        ).prefetch_related("options")

    def perform_create(self, serializer):
        quiz = Quiz.objects.get(id=self.kwargs["quiz_id"], owner=self.request.user)
        last_order = quiz.questions.count()
        serializer.save(quiz=quiz, order=last_order)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /quizzes/{quiz_id}/questions/{pk}/"""
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return Question.objects.filter(
            quiz__id=self.kwargs["quiz_id"],
            quiz__owner=self.request.user,
        ).prefetch_related("options")


class AnswerOptionListCreateView(generics.ListCreateAPIView):
    """POST /quizzes/{quiz_id}/questions/{question_id}/options/"""
    serializer_class = AnswerOptionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return AnswerOption.objects.filter(
            question__id=self.kwargs["question_id"],
            question__quiz__owner=self.request.user,
        )

    def perform_create(self, serializer):
        question = Question.objects.get(
            id=self.kwargs["question_id"],
            quiz__id=self.kwargs["quiz_id"],
            quiz__owner=self.request.user,
        )
        serializer.save(question=question)


class AnswerOptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /quizzes/{quiz_id}/questions/{question_id}/options/{pk}/"""
    serializer_class = AnswerOptionSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return AnswerOption.objects.filter(
            question__id=self.kwargs["question_id"],
            question__quiz__owner=self.request.user,
        )


# ─── CSV Import ───────────────────────────────────────────────────────────────

_REQUIRED_HEADERS  = {"question", "option_a", "option_b", "correct"}
_CORRECT_MAP       = {"a": 0, "b": 1, "c": 2, "d": 3}
_VALID_DIFFICULTIES = {"easy", "medium", "hard"}
_MAX_QUESTIONS     = 200
_MAX_FILE_BYTES    = 5 * 1024 * 1024   # 5 MB


def _parse_csv_file(file_obj):
    """
    Parse and validate a CSV file object.

    Returns (questions, parse_errors).
      questions    — list of validated question dicts, ready for DB insert.
      parse_errors — list of {row, question_preview, messages} for bad rows.

    Raises ValueError for fatal file-level problems (wrong type, encoding,
    missing headers, empty file).
    """
    if not file_obj.name.lower().endswith(".csv"):
        raise ValueError("File must be a .csv file.")

    if file_obj.size > _MAX_FILE_BYTES:
        raise ValueError("File too large — maximum size is 5 MB.")

    # UTF-8 with BOM first, fall back to Latin-1 for Excel-exported CSVs
    raw = file_obj.read()
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(content))

    if not reader.fieldnames:
        raise ValueError("CSV file is empty or has no header row.")

    norm_headers = {h.strip().lower() for h in reader.fieldnames if h}
    missing = _REQUIRED_HEADERS - norm_headers
    if missing:
        raise ValueError(
            f"Missing required column(s): {', '.join(sorted(missing))}. "
            "Required: question, option_a, option_b, correct"
        )

    questions    = []
    parse_errors = []

    for row_num, raw_row in enumerate(reader, start=2):   # row 1 = header
        if len(questions) + len(parse_errors) >= _MAX_QUESTIONS:
            parse_errors.append({
                "row": row_num,
                "question_preview": "",
                "messages": [f"Stopped — maximum {_MAX_QUESTIONS} questions per import."],
            })
            break

        # Normalise every key/value (strip whitespace, lower-case keys)
        row = {
            k.strip().lower(): (v or "").strip()
            for k, v in raw_row.items()
            if k
        }

        row_errors = []

        # ── Question text ─────────────────────────────────────────────────────
        text = row.get("question", "")
        if not text:
            row_errors.append("Question text is empty.")
        elif len(text) > 500:
            row_errors.append(f"Question text too long ({len(text)} chars, max 500).")

        # ── Options A-D ───────────────────────────────────────────────────────
        raw_options = [
            row.get("option_a", ""),
            row.get("option_b", ""),
            row.get("option_c", ""),
            row.get("option_d", ""),
        ]
        filled_count = sum(1 for t in raw_options if t)
        if filled_count < 2:
            row_errors.append(
                "At least 2 options are required (option_a and option_b)."
            )

        # ── Correct answer ────────────────────────────────────────────────────
        correct_raw = row.get("correct", "").lower()
        correct_idx = _CORRECT_MAP.get(correct_raw)
        if correct_idx is None:
            row_errors.append(
                f"Invalid 'correct' value \"{row.get('correct', '')}\" "
                "— must be A, B, C, or D."
            )
        elif raw_options[correct_idx] == "":
            row_errors.append(
                f"Correct answer points to option {correct_raw.upper()} "
                "which is empty."
            )

        # ── Difficulty ────────────────────────────────────────────────────────
        difficulty = (row.get("difficulty", "") or "medium").lower()
        if difficulty not in _VALID_DIFFICULTIES:
            row_errors.append(
                f"Invalid difficulty \"{row.get('difficulty', '')}\" "
                "— must be easy, medium, or hard."
            )
            difficulty = "medium"

        # ── Time limit (seconds) ──────────────────────────────────────────────
        time_raw = row.get("time_limit", "30") or "30"
        try:
            time_limit = int(time_raw)
            if not (10 <= time_limit <= 120):
                row_errors.append(
                    f"time_limit {time_limit} out of range — must be 10–120."
                )
                time_limit = 30
        except ValueError:
            row_errors.append(
                f"Invalid time_limit \"{time_raw}\" — must be a whole number."
            )
            time_limit = 30

        # ── Base points ───────────────────────────────────────────────────────
        pts_raw = row.get("points", "100") or "100"
        try:
            base_points = int(pts_raw)
            if not (10 <= base_points <= 1000):
                row_errors.append(
                    f"points {base_points} out of range — must be 10–1000."
                )
                base_points = 100
        except ValueError:
            row_errors.append(
                f"Invalid points \"{pts_raw}\" — must be a whole number."
            )
            base_points = 100

        # ── Collect errors ────────────────────────────────────────────────────
        if row_errors:
            parse_errors.append({
                "row":              row_num,
                "question_preview": (text[:60] + "…") if len(text) > 60 else text,
                "messages":         row_errors,
            })
            continue

        # ── Build options list (only filled slots) ────────────────────────────
        options = []
        for i, opt_text in enumerate(raw_options):
            if opt_text:
                options.append({
                    "text":       opt_text,
                    "is_correct": i == correct_idx,
                    "order":      len(options),
                })

        # ── Auto-detect True/False type ───────────────────────────────────────
        opt_texts_lower = {o["text"].lower() for o in options}
        question_type = (
            "truefalse"
            if len(options) == 2 and opt_texts_lower == {"true", "false"}
            else "mcq"
        )

        questions.append({
            "row":             row_num,
            "text":            text,
            "question_type":   question_type,
            "difficulty":      difficulty,
            "time_limit_secs": time_limit,
            "base_points":     base_points,
            "options":         options,
            "correct_label":   correct_raw.upper(),
        })

    return questions, parse_errors


class QuizCSVPreviewView(APIView):
    """
    POST /quizzes/csv/preview/
    Accepts multipart/form-data with a 'file' field (CSV).
    Parses every row and returns full validation results. Nothing is saved.
    """
    permission_classes = [IsTeacher]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"error": "No file uploaded. Send the CSV as 'file' in form-data."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            questions, parse_errors = _parse_csv_file(file_obj)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "valid_count":  len(questions),
            "error_count":  len(parse_errors),
            "questions":    questions,
            "parse_errors": parse_errors,
        })


class QuizCSVImportView(APIView):
    """
    POST /quizzes/csv/import/
    Accepts JSON body:
      {
        title:       string   (required when quiz_id is absent — creates new quiz)
        description: string   (optional)
        is_public:   bool     (optional, default false)
        quiz_id:     uuid     (optional — append to an existing quiz)
        questions:   [...]    (the 'questions' array from the preview endpoint)
      }

    Re-validates every question server-side, then bulk-creates everything in
    one atomic transaction. Returns { quiz_id, quiz_title, imported_count }.
    """
    permission_classes = [IsTeacher]

    @transaction.atomic
    def post(self, request):
        questions_data = request.data.get("questions") or []
        if not questions_data:
            return Response(
                {"error": "No questions to import."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(questions_data) > _MAX_QUESTIONS:
            return Response(
                {"error": f"Maximum {_MAX_QUESTIONS} questions per import."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Resolve target quiz ───────────────────────────────────────────────
        quiz_id_raw = (request.data.get("quiz_id") or "").strip()
        if quiz_id_raw:
            # Append to an existing quiz
            try:
                quiz = Quiz.objects.get(id=quiz_id_raw, owner=request.user)
            except Quiz.DoesNotExist:
                return Response(
                    {"error": "Quiz not found or you don't have permission."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            # Create a brand-new quiz
            title = (request.data.get("title") or "").strip()
            if not title:
                return Response(
                    {"error": "Quiz title is required when creating a new quiz."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            quiz = Quiz.objects.create(
                owner=request.user,
                title=title,
                description=(request.data.get("description") or "").strip(),
                is_public=bool(request.data.get("is_public", False)),
            )

        # ── Re-validate every question server-side ────────────────────────────
        validated = []
        for i, q in enumerate(questions_data, start=1):
            text = (q.get("text") or "").strip()
            if not text:
                return Response(
                    {"error": f"Question {i}: text is empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            raw_opts = q.get("options") or []
            filled   = [o for o in raw_opts if (o.get("text") or "").strip()]
            if len(filled) < 2:
                return Response(
                    {"error": f"Question {i}: needs at least 2 non-empty options."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            correct_n = sum(1 for o in filled if o.get("is_correct"))
            if correct_n != 1:
                return Response(
                    {"error": f"Question {i}: must have exactly one correct option."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            difficulty    = (q.get("difficulty") or "medium").lower()
            if difficulty not in _VALID_DIFFICULTIES:
                difficulty = "medium"

            question_type = q.get("question_type", "mcq")
            if question_type not in ("mcq", "truefalse"):
                question_type = "mcq"

            try:
                time_limit = max(10, min(120, int(q.get("time_limit_secs", 30))))
            except (ValueError, TypeError):
                time_limit = 30

            try:
                base_points = max(10, min(1000, int(q.get("base_points", 100))))
            except (ValueError, TypeError):
                base_points = 100

            validated.append({
                "text":            text,
                "question_type":   question_type,
                "difficulty":      difficulty,
                "time_limit_secs": time_limit,
                "base_points":     base_points,
                "options": [
                    {
                        "text":       o["text"].strip(),
                        "is_correct": bool(o.get("is_correct", False)),
                        "order":      idx,
                    }
                    for idx, o in enumerate(filled)
                    if (o.get("text") or "").strip()
                ],
            })

        # ── Bulk create (questions + options in one transaction) ──────────────
        start_order = quiz.questions.count()

        for offset, q_data in enumerate(validated):
            question = Question.objects.create(
                quiz=quiz,
                text=q_data["text"],
                question_type=q_data["question_type"],
                difficulty=q_data["difficulty"],
                time_limit_secs=q_data["time_limit_secs"],
                base_points=q_data["base_points"],
                order=start_order + offset,
            )
            AnswerOption.objects.bulk_create([
                AnswerOption(
                    question=question,
                    text=o["text"],
                    is_correct=o["is_correct"],
                    order=o["order"],
                )
                for o in q_data["options"]
            ])

        return Response(
            {
                "quiz_id":        str(quiz.id),
                "quiz_title":     quiz.title,
                "imported_count": len(validated),
            },
            status=status.HTTP_201_CREATED,
        )