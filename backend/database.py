from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = "sqlite:///./tracker.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db():
    SQLModel.metadata.create_all(engine)
    # Add is_admin column to existing DBs that predate the field
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(
            __import__('sqlalchemy').text("PRAGMA table_info('user')")
        )]
        if 'is_admin' not in cols:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE user ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"
            ))
            conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
