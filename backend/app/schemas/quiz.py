from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class QuestionResponse(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    
    class Config:
        from_attributes = True

class QuestionDetailResponse(QuestionResponse):
    correct_option: str
    explanation: Optional[str] = None

class QuizBase(BaseModel):
    title: str
    match_id: int

class QuizResponse(QuizBase):
    id: int
    questions_count: int

    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    match_id: int

class QuizAttemptResponse(BaseModel):
    id: str
    quiz_id: int
    score: int
    current_question_index: int
    total_questions: int
    is_completed: bool
    next_question: Optional[QuestionResponse] = None

    class Config:
        from_attributes = True

class AnswerSubmission(BaseModel):
    chosen_option: str  # "A", "B", "C", or "D"

class AnswerFeedbackResponse(BaseModel):
    chosen_option: str
    correct_option: str
    is_correct: bool
    explanation: Optional[str] = None
    next_question: Optional[QuestionResponse] = None
    is_completed: bool
    accumulated_score: int

    class Config:
        from_attributes = True

class QuizAnswerSummary(BaseModel):
    question_text: str
    chosen_option: str
    correct_option: str
    is_correct: bool
    explanation: Optional[str] = None

class QuizAttemptSummary(BaseModel):
    id: str
    quiz_title: str
    score: int
    correct_answers_count: int
    total_questions: int
    created_at: datetime
    answers: List[QuizAnswerSummary]

    class Config:
        from_attributes = True
