from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association table for many‑to‑many relationship between leagues and users
league_user = Table(
    "league_user",
    Base.metadata,
    Column("league_id", Integer, ForeignKey("leagues.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)

class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    # owner of the league
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="owned_leagues")
    # members (including owner) – many‑to‑many via association table
    members = relationship(
        "User",
        secondary=league_user,
        back_populates="leagues",
    )

    def __repr__(self) -> str:
        return f"<League id={self.id} name={self.name}>"
