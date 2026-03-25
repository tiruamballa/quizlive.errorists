"""
Analytics views. File goes to: apps/analytics/views.py

Response shapes matched to what AnalyticsPage.jsx expects:

  GET /summary/   → { quiz_title, started_at, ended_at, total_players,
                       avg_score, correct_pct, avg_resp_time }

  GET /questions/ → { questions: [{ question_id, question_text, order,
                                    accuracy_pct, correct, total, avg_time_secs }] }

  GET /players/   → { players: [{ player_id, nickname, final_score, final_rank,
                                   correct, total_answers, accuracy_pct, avg_resp_time }] }

  GET /export/    → CSV file download
"""
import csv
import io
import logging

from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsTeacher
from apps.quiz_sessions.models import GameSession, PlayerAnswer, PlayerSession  # ← FIXED import

logger = logging.getLogger(__name__)


def _get_session(game_code: str, host=None):
    qs = GameSession.objects.select_related("quiz", "host")
    if host:
        qs = qs.filter(host=host)
    return qs.filter(game_code=game_code.upper()).first()


class SessionSummaryView(APIView):
    """GET /api/v1/analytics/sessions/<code>/summary/"""
    permission_classes = [IsTeacher]

    def get(self, request, game_code: str):
        session = _get_session(game_code, host=request.user)
        if not session:
            return Response({"error": "Session not found."}, status=404)

        players   = list(PlayerSession.objects.filter(game_session=session))
        answers   = list(PlayerAnswer.objects.filter(player_session__game_session=session))
        total_p   = len(players)
        avg_score = round(sum(p.final_score for p in players) / total_p, 1) if total_p else 0

        total_a   = len(answers)
        correct_a = sum(1 for a in answers if a.is_correct)
        correct_pct = round(correct_a / total_a * 100, 1) if total_a else 0
        avg_resp    = round(sum(a.response_time for a in answers) / total_a, 1) if total_a else 0

        return Response({
            "quiz_title":    session.quiz.title,
            "started_at":    session.started_at,
            "ended_at":      session.ended_at,
            "total_players": total_p,
            "avg_score":     avg_score,
            "correct_pct":   correct_pct,
            "avg_resp_time": avg_resp,
        })


class QuestionAnalyticsView(APIView):
    """GET /api/v1/analytics/sessions/<code>/questions/"""
    permission_classes = [IsTeacher]

    def get(self, request, game_code: str):
        session = _get_session(game_code, host=request.user)
        if not session:
            return Response({"error": "Session not found."}, status=404)

        questions = session.quiz.questions.order_by("order")
        result = []
        for q in questions:
            answers  = list(PlayerAnswer.objects.filter(
                player_session__game_session=session, question=q
            ))
            total    = len(answers)
            correct  = sum(1 for a in answers if a.is_correct)
            accuracy = round(correct / total * 100, 1) if total else 0
            avg_time = round(sum(a.response_time for a in answers) / total, 1) if total else 0
            result.append({
                "question_id":   str(q.id),
                "question_text": q.text,
                "order":         q.order,
                "accuracy_pct":  accuracy,
                "correct":       correct,    # frontend: q.correct
                "total":         total,      # frontend: q.total
                "avg_time_secs": avg_time,   # frontend: q.avg_time_secs
            })

        return Response({"questions": result})


class PlayerResultsView(APIView):
    """GET /api/v1/analytics/sessions/<code>/players/"""
    permission_classes = [IsTeacher]

    def get(self, request, game_code: str):
        session = _get_session(game_code, host=request.user)
        if not session:
            return Response({"error": "Session not found."}, status=404)

        players = PlayerSession.objects.filter(
            game_session=session
        ).order_by("final_rank", "-final_score")

        result = []
        for p in players:
            answers      = list(p.answers.all())
            total_ans    = len(answers)
            correct_ans  = sum(1 for a in answers if a.is_correct)
            accuracy     = round(correct_ans / total_ans * 100, 1) if total_ans else 0
            avg_resp     = round(sum(a.response_time for a in answers) / total_ans, 2) if total_ans else 0
            result.append({
                "player_id":     str(p.id),
                "nickname":      p.nickname,
                "final_score":   p.final_score,
                "final_rank":    p.final_rank,
                "correct":       correct_ans,   # frontend: p.correct
                "total_answers": total_ans,      # frontend: p.total_answers
                "accuracy_pct":  accuracy,       # frontend: p.accuracy_pct
                "avg_resp_time": round(avg_resp, 1),  # frontend: p.avg_resp_time
            })

        return Response({"players": result})


class ExportCSVView(APIView):
    """GET /api/v1/analytics/sessions/<code>/export/"""
    permission_classes = [IsTeacher]

    def get(self, request, game_code: str):
        session = _get_session(game_code, host=request.user)
        if not session:
            return Response({"error": "Session not found."}, status=404)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Rank", "Nickname", "Score", "Correct", "Total Answers", "Accuracy %"])

        for p in PlayerSession.objects.filter(game_session=session).order_by("final_rank", "-final_score"):
            answers  = list(p.answers.all())
            total    = len(answers)
            correct  = sum(1 for a in answers if a.is_correct)
            accuracy = round(correct / total * 100, 1) if total else 0
            writer.writerow([p.final_rank or "", p.nickname, p.final_score, correct, total, accuracy])

        output.seek(0)
        response = HttpResponse(output.read(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="quizlive_{game_code.upper()}.csv"'
        return response
