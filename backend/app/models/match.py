from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    status = Column(String, default="UPCOMING", nullable=False)  # UPCOMING or FINISHED
    match_date = Column(DateTime, nullable=False)
    stadium = Column(String, nullable=True)

    # One-to-one relationship with Quiz
    quiz = relationship("Quiz", back_populates="match", uselist=False, cascade="all, delete-orphan")
