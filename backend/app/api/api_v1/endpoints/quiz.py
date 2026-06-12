from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.match import Match
from app.models.quiz import Quiz, Question, QuizAttempt, QuizAnswer
from app.models.user import User
from app.schemas.quiz import (
    QuizAttemptCreate,
    QuizAttemptResponse,
    AnswerSubmission,
    AnswerFeedbackResponse,
    QuizAttemptSummary,
    QuestionResponse
)

router = APIRouter()

@router.post("/attempts", response_model=QuizAttemptResponse)
def start_quiz_attempt(
    attempt_in: QuizAttemptCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Start a new quiz attempt for a match.
    """
    # 1. Fetch match
    match = db.query(Match).filter(Match.id == attempt_in.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match.status != "FINISHED":
        raise HTTPException(
            status_code=400,
            detail="Quizzes can only be taken for finished matches"
        )
        
    # 2. Fetch quiz
    quiz = db.query(Quiz).filter(Quiz.match_id == match.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found for this match")
        
    # Check if user already completed an attempt for this quiz (Optional: limit to one attempt per quiz)
    existing_attempt = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.is_completed == True
    ).first()
    if existing_attempt:
        raise HTTPException(
            status_code=400,
            detail="You have already completed the quiz for this match"
        )
        
    # Check if there is an active, uncompleted attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.is_completed == False
    ).first()
    
    if not attempt:
        # Create new attempt
        attempt = QuizAttempt(
            user_id=current_user.id,
            quiz_id=quiz.id,
            score=0,
            current_question_index=0,
            is_completed=False
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        
    # Get total questions
    questions = db.query(Question).filter(Question.quiz_id == quiz.id).order_by(Question.id).all()
    total_questions = len(questions)
    
    if total_questions == 0:
        raise HTTPException(status_code=404, detail="This quiz has no questions")
        
    # Get first/current question
    current_q = questions[attempt.current_question_index]
    
    return {
        "id": attempt.id,
        "quiz_id": attempt.quiz_id,
        "score": attempt.score,
        "current_question_index": attempt.current_question_index,
        "total_questions": total_questions,
        "is_completed": attempt.is_completed,
        "next_question": current_q
    }

@router.post("/attempts/{attempt_id}/submit", response_model=AnswerFeedbackResponse)
def submit_answer(
    attempt_id: str,
    answer_in: AnswerSubmission,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Submit an answer for the current question in the quiz attempt.
    """
    # 1. Fetch attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id,
        QuizAttempt.user_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
        
    if attempt.is_completed:
        raise HTTPException(status_code=400, detail="Quiz attempt is already completed")
        
    # 2. Get questions for this quiz
    questions = db.query(Question).filter(Question.quiz_id == attempt.quiz_id).order_by(Question.id).all()
    total_questions = len(questions)
    
    if attempt.current_question_index >= total_questions:
        # Fallback security check
        attempt.is_completed = True
        db.commit()
        raise HTTPException(status_code=400, detail="Quiz attempt is already completed")
        
    current_q = questions[attempt.current_question_index]
    
    # Check if answer has already been submitted for this specific question during this attempt
    existing_answer = db.query(QuizAnswer).filter(
        QuizAnswer.attempt_id == attempt.id,
        QuizAnswer.question_id == current_q.id
    ).first()
    if existing_answer:
        raise HTTPException(status_code=400, detail="Answer already submitted for this question")
        
    # 3. Evaluate answer
    chosen_opt = answer_in.chosen_option.upper().strip()
    correct_opt = current_q.correct_option.upper().strip()
    is_correct = chosen_opt == correct_opt
    
    # 10 points per correct answer
    points_earned = 10 if is_correct else 0
    attempt.score += points_earned
    
    # 4. Save answer
    db_answer = QuizAnswer(
        attempt_id=attempt.id,
        question_id=current_q.id,
        chosen_option=chosen_opt,
        is_correct=is_correct
    )
    db.add(db_answer)
    
    # 5. Move to next question index
    attempt.current_question_index += 1
    
    # 6. Check if completed
    is_completed = attempt.current_question_index >= total_questions
    next_q = None
    
    if is_completed:
        attempt.is_completed = True
        
        # Update user totals
        current_user.total_score += attempt.score
        current_user.quizzes_completed += 1
        
        # Count total correct answers in this attempt
        correct_answers_count = db.query(QuizAnswer).filter(
            QuizAnswer.attempt_id == attempt.id,
            QuizAnswer.is_correct == True
        ).count()
        # Add the current correct answer if it is correct
        if is_correct:
            correct_answers_count += 1
            
        current_user.total_correct_answers += correct_answers_count
        db.add(current_user)
    else:
        next_q = questions[attempt.current_question_index]
        
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    if is_completed:
        db.refresh(current_user)
        
    return {
        "chosen_option": chosen_opt,
        "correct_option": correct_opt,
        "is_correct": is_correct,
        "explanation": current_q.explanation,
        "next_question": next_q,
        "is_completed": is_completed,
        "accumulated_score": attempt.score
    }

@router.get("/attempts/{attempt_id}/summary", response_model=QuizAttemptSummary)
def get_quiz_attempt_summary(
    attempt_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get summary of a completed quiz attempt.
    """
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.id == attempt_id,
        QuizAttempt.user_id == current_user.id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
        
    if not attempt.is_completed:
        raise HTTPException(status_code=400, detail="Quiz attempt is not completed yet")
        
    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    questions = db.query(Question).filter(Question.quiz_id == attempt.quiz_id).order_by(Question.id).all()
    answers = db.query(QuizAnswer).filter(QuizAnswer.attempt_id == attempt.id).all()
    
    # Map answers to a lookup dictionary by question_id
    answers_dict = {ans.question_id: ans for ans in answers}
    
    answers_summary = []
    correct_count = 0
    for q in questions:
        ans = answers_dict.get(q.id)
        chosen_option = ans.chosen_option if ans else "N/A"
        is_correct = ans.is_correct if ans else False
        
        if is_correct:
            correct_count += 1
            
        answers_summary.append({
            "question_text": q.question_text,
            "chosen_option": chosen_option,
            "correct_option": q.correct_option,
            "is_correct": is_correct,
            "explanation": q.explanation
        })
        
    return {
        "id": attempt.id,
        "quiz_title": quiz.title if quiz else "Football Match Quiz",
        "score": attempt.score,
        "correct_answers_count": correct_count,
        "total_questions": len(questions),
        "created_at": attempt.created_at,
        "answers": answers_summary
    }
