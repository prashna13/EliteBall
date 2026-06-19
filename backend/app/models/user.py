from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture_url = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)

    total_score = Column(Integer, default=0, nullable=False)
    quizzes_completed = Column(Integer, default=0, nullable=False)
    total_correct_answers = Column(Integer, default=0, nullable=False)

    # Relationships
    attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    
    # Leagues relationships
    owned_leagues = relationship("League", back_populates="owner", foreign_keys="[League.owner_id]")
    leagues = relationship("League", secondary="league_user", back_populates="members")
    
    # We will define friendships manually or using self-referential relationships

