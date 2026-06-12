import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.match import Match
from app.models.quiz import Quiz, Question

def seed_db():
    print("Seeding database...")
    db: Session = SessionLocal()
    try:
        # Create all tables if not exists
        Base.metadata.create_all(bind=engine)

        # Clear existing data to allow re-seeding
        db.query(Question).delete()
        db.query(Quiz).delete()
        db.query(Match).delete()
        # Keep users if they exist, or clear and recreate
        db.query(User).delete()
        db.commit()

        # 1. Seed Users
        users = [
            User(
                username="messi10",
                email="messi@ebk.com",
                hashed_password=get_password_hash("password123"),
                total_score=180,
                quizzes_completed=2,
                total_correct_answers=18
            ),
            User(
                username="cr7goat",
                email="ronaldo@ebk.com",
                hashed_password=get_password_hash("password123"),
                total_score=150,
                quizzes_completed=2,
                total_correct_answers=15
            ),
            User(
                username="mbappe",
                email="mbappe@ebk.com",
                hashed_password=get_password_hash("password123"),
                total_score=90,
                quizzes_completed=1,
                total_correct_answers=9
            ),
            User(
                username="belligoal",
                email="bellingham@ebk.com",
                hashed_password=get_password_hash("password123"),
                total_score=0,
                quizzes_completed=0,
                total_correct_answers=0
            ),
        ]
        for u in users:
            db.add(u)
        db.commit()
        print("Users seeded.")

        # 2. Seed Matches
        match_date_1 = datetime.now(timezone.utc) - timedelta(days=2)
        match_date_2 = datetime.now(timezone.utc) - timedelta(days=5)
        match_date_3 = datetime.now(timezone.utc) + timedelta(days=3)

        matches = [
            Match(
                id=1,
                home_team="Argentina",
                away_team="France",
                home_score=3,
                away_score=3,
                status="FINISHED",
                match_date=match_date_1,
                stadium="MetLife Stadium, New Jersey / New York"
            ),
            Match(
                id=2,
                home_team="USA",
                away_team="England",
                home_score=1,
                away_score=1,
                status="FINISHED",
                match_date=match_date_2,
                stadium="SoFi Stadium, Los Angeles"
            ),
            Match(
                id=3,
                home_team="Brazil",
                away_team="Germany",
                home_score=None,
                away_score=None,
                status="UPCOMING",
                match_date=match_date_3,
                stadium="Azteca Stadium, Mexico City"
            )
        ]
        for m in matches:
            db.add(m)
        db.commit()
        print("Matches seeded.")

        # 3. Seed Quizzes
        quiz1 = Quiz(id=1, match_id=1, title="2026 World Cup Final: Argentina vs France")
        quiz2 = Quiz(id=2, match_id=2, title="2026 World Cup Group Stage: USA vs England")
        db.add(quiz1)
        db.add(quiz2)
        db.commit()
        print("Quizzes seeded.")

        # 4. Seed Questions for Quiz 1 (Argentina vs France - 10 questions)
        q1_list = [
            Question(
                quiz_id=1,
                question_text="Who scored the opening goal in the 2026 World Cup Final?",
                option_a="Lionel Messi",
                option_b="Kylian Mbappé",
                option_c="Julian Alvarez",
                option_d="Antoine Griezmann",
                correct_option="A",
                explanation="Lionel Messi opened the scoring in the 23rd minute with a penalty kick after Angel Di Maria was fouled in the box."
            ),
            Question(
                quiz_id=1,
                question_text="What was the score at the end of regular time (90 minutes)?",
                option_a="1-1",
                option_b="2-2",
                option_c="3-3",
                option_d="0-0",
                correct_option="B",
                explanation="The match ended 2-2 in regular time after Kylian Mbappé scored two quick goals in the 80th and 81st minutes to cancel out Argentina's 2-0 lead."
            ),
            Question(
                quiz_id=1,
                question_text="Who won the Golden Glove award for the best goalkeeper at the 2026 World Cup?",
                option_a="Mike Maignan",
                option_b="Emiliano Martínez",
                option_c="Matt Turner",
                option_d="Jordan Pickford",
                correct_option="B",
                explanation="Emiliano Martínez won the Golden Glove following his heroics in penalty shootouts and crucial last-minute saves during the tournament."
            ),
            Question(
                quiz_id=1,
                question_text="Which stadium hosted the 2026 World Cup Final?",
                option_a="SoFi Stadium, Los Angeles",
                option_b="Azteca Stadium, Mexico City",
                option_c="MetLife Stadium, New Jersey",
                option_d="AT&T Stadium, Dallas",
                correct_option="C",
                explanation="MetLife Stadium in East Rutherford, New Jersey was selected as the host venue for the grand final of the 2026 World Cup."
            ),
            Question(
                quiz_id=1,
                question_text="Who assisted Angel Di Maria's goal that made it 2-0 in the first half?",
                option_a="Rodrigo De Paul",
                option_b="Alexis Mac Allister",
                option_c="Lionel Messi",
                option_d="Enzo Fernández",
                correct_option="B",
                explanation="Alexis Mac Allister provided the assist, playing a perfect cross to Di Maria after a rapid counter-attack initiated by Lionel Messi."
            ),
            Question(
                quiz_id=1,
                question_text="Kylian Mbappé scored a hat-trick in the final. How many of his goals were penalties (excluding the shootout)?",
                option_a="1",
                option_b="2",
                option_c="0",
                option_d="3",
                correct_option="B",
                explanation="Mbappé scored two penalty kicks: one in the 80th minute and one in the 118th minute of extra time."
            ),
            Question(
                quiz_id=1,
                question_text="How many yellow cards in total were handed out to Argentina players during the final?",
                option_a="1",
                option_b="4",
                option_c="2",
                option_d="5",
                correct_option="B",
                explanation="Argentina received 4 yellow cards: Fernandez, Acuna, Montiel, and Martinez were booked."
            ),
            Question(
                quiz_id=1,
                question_text="Which French player had their penalty saved by Emiliano Martínez in the shootout?",
                option_a="Kylian Mbappé",
                option_b="Kingsley Coman",
                option_c="Aurelien Tchouameni",
                option_d="Randal Kolo Muani",
                correct_option="B",
                explanation="Emiliano Martínez saved Kingsley Coman's penalty, diving to his right, giving Argentina an early advantage in the shootout."
            ),
            Question(
                quiz_id=1,
                question_text="What was the approximate ball possession for Argentina in the first half of the final?",
                option_a="38%",
                option_b="60%",
                option_c="48%",
                option_d="70%",
                correct_option="B",
                explanation="Argentina dominated the first half with roughly 60% ball possession, keeping France completely pinned in their own half."
            ),
            Question(
                quiz_id=1,
                question_text="Who scored the final, trophy-winning penalty for Argentina in the shootout?",
                option_a="Lionel Messi",
                option_b="Gonzalo Montiel",
                option_c="Leandro Paredes",
                option_d="Paulo Dybala",
                correct_option="B",
                explanation="Gonzalo Montiel scored the decisive penalty to make it 4-2 in the shootout, securing Argentina's World Cup victory."
            )
        ]
        for q in q1_list:
            db.add(q)

        # 5. Seed Questions for Quiz 2 (USA vs England - 10 questions)
        q2_list = [
            Question(
                quiz_id=2,
                question_text="What was the final score in the 2026 World Cup Group Stage match between USA and England?",
                option_a="0-0",
                option_b="1-1",
                option_c="2-1",
                option_d="0-2",
                correct_option="B",
                explanation="The match ended in a thrilling 1-1 draw in the group stages of the World Cup."
            ),
            Question(
                quiz_id=2,
                question_text="Who scored the opening goal for England in the first half?",
                option_a="Harry Kane",
                option_b="Jude Bellingham",
                option_c="Bukayo Saka",
                option_d="Phil Foden",
                correct_option="C",
                explanation="Bukayo Saka scored the opening goal in the 34th minute after receiving a pass from Jude Bellingham."
            ),
            Question(
                quiz_id=2,
                question_text="Who scored the equalizer for the USA?",
                option_a="Timothy Weah",
                option_b="Christian Pulisic",
                option_c="Folarin Balogun",
                option_d="Weston McKennie",
                correct_option="B",
                explanation="Christian Pulisic scored a beautiful half-volley in the 68th minute to equalize for the USMNT."
            ),
            Question(
                quiz_id=2,
                question_text="In which stadium was the USA vs England match played?",
                option_a="Mercedes-Benz Stadium, Atlanta",
                option_b="SoFi Stadium, Los Angeles",
                option_c="MetLife Stadium, New Jersey",
                option_d="Lumen Field, Seattle",
                correct_option="B",
                explanation="The match was played at SoFi Stadium in Los Angeles, California in front of a sold-out crowd."
            ),
            Question(
                quiz_id=2,
                question_text="Who was awarded the Player of the Match?",
                option_a="Bukayo Saka",
                option_b="Christian Pulisic",
                option_c="Weston McKennie",
                option_d="Declan Rice",
                correct_option="B",
                explanation="Christian Pulisic won Player of the Match for his outstanding performance and crucial equalizer."
            ),
            Question(
                quiz_id=2,
                question_text="How many total shots did the USA take during the match?",
                option_a="6",
                option_b="14",
                option_c="10",
                option_d="20",
                correct_option="B",
                explanation="The USA was highly active in attack, register 14 shots compared to England's 9."
            ),
            Question(
                quiz_id=2,
                question_text="Which USA player hit the crossbar with a powerful strike in the first half?",
                option_a="Weston McKennie",
                option_b="Yunus Musah",
                option_c="Christian Pulisic",
                option_d="Tyler Adams",
                correct_option="A",
                explanation="Weston McKennie missed a close-range shot, hitting the crossbar in the 26th minute."
            ),
            Question(
                quiz_id=2,
                question_text="Who was the starting goalkeeper for the USA in this match?",
                option_a="Zack Steffen",
                option_b="Matt Turner",
                option_c="Ethan Horvath",
                option_d="Drake Callender",
                correct_option="B",
                explanation="Matt Turner was the starting goalkeeper, making 4 vital saves to keep the USA in the game."
            ),
            Question(
                quiz_id=2,
                question_text="Who was the England manager during the 2026 World Cup?",
                option_a="Gareth Southgate",
                option_b="Thomas Tuchel",
                option_c="Lee Carsley",
                option_d="Eddie Howe",
                correct_option="B",
                explanation="Thomas Tuchel led the Three Lions during their 2026 World Cup campaign."
            ),
            Question(
                quiz_id=2,
                question_text="How many corners did the USA win during this match?",
                option_a="2",
                option_b="7",
                option_c="5",
                option_d="10",
                correct_option="B",
                explanation="The USA won 7 corners, putting pressure on England's defense throughout the second half."
            )
        ]
        for q in q2_list:
            db.add(q)

        db.commit()
        print("Questions seeded successfully.")
        print("Database seeding completed.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
