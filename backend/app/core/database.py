from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Configure SQLite vs PostgreSQL connection options
connect_args: dict = {}
engine_kwargs: dict = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.DATABASE_URL.startswith("postgresql"):
    connect_args = {"sslmode": "require"}
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

SERIAL_TABLES = ("users", "matches", "quizzes", "questions", "friendships", "quiz_answers")


def fix_postgres_sequences() -> None:
    """Reset Postgres ID sequences after manual/seed inserts with explicit IDs."""
    if not settings.DATABASE_URL.startswith("postgresql"):
        return

    try:
        insp = inspect(engine)
        existing_tables = set(insp.get_table_names())
        with engine.begin() as conn:
            for table in SERIAL_TABLES:
                if table not in existing_tables:
                    continue
                conn.execute(
                    text(
                        f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table}', 'id'),
                            COALESCE((SELECT MAX(id) FROM {table}), 1),
                            true
                        )
                        """
                    )
                )
    except Exception:
        return


def ensure_schema() -> None:
    """
    Lightweight schema guard for environments without migrations.
    Supabase/Postgres won't be altered by create_all(), so we add critical columns if missing.
    """
    try:
        insp = inspect(engine)
        if "users" not in insp.get_table_names():
            return

        cols = {c["name"] for c in insp.get_columns("users")}
        if "is_admin" not in cols:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE")
                )

        fix_postgres_sequences()
    except Exception:
        # Don't block startup if inspection fails; real errors will surface on queries.
        return


def init_db() -> None:
    """
    Prepare the database on startup.
    SQLite: create tables locally.
    Supabase/Postgres: skip create_all (tables already exist remotely).
    """
    import app.models  # noqa: F401 - register SQLAlchemy models

    if settings.DATABASE_URL.startswith("sqlite"):
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as exc:
            print(f"Warning: could not create SQLite tables: {exc}")

    ensure_schema()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
