import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator, Any, Dict, List
from app.core.config import settings


class Database:
    """Database connection manager."""

    def __init__(self):
        self.connection_params = {
            "host": settings.database_host,
            "port": settings.database_port,
            "database": settings.database_name,
            "user": settings.database_user,
            "password": settings.database_password,
        }

    @contextmanager
    def get_connection(self) -> Generator:
        """Get database connection context manager."""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            yield conn
        finally:
            if conn:
                conn.close()

    @contextmanager
    def get_cursor(self, dict_cursor: bool = True) -> Generator:
        """Get database cursor context manager."""
        with self.get_connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cursor
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                cursor.close()

    def execute(self, query: str, params: tuple = None) -> None:
        """Execute a query without returning results."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)

    def fetch_one(self, query: str, params: tuple = None) -> Dict[str, Any]:
        """Fetch one row from the database."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()

    def fetch_all(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Fetch all rows from the database."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()

    def init_db(self):
        """Initialize database tables."""
        create_table_query = """
        CREATE TABLE IF NOT EXISTS hands (
            id SERIAL PRIMARY KEY,
            hand_id VARCHAR(255) UNIQUE NOT NULL,
            stack_size INTEGER NOT NULL,
            dealer_position INTEGER NOT NULL,
            small_blind_position INTEGER NOT NULL,
            big_blind_position INTEGER NOT NULL,
            player_cards JSONB NOT NULL,
            actions TEXT NOT NULL,
            board_cards VARCHAR(255),
            winnings JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        self.execute(create_table_query)


db = Database()