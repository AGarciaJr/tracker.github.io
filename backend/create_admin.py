#!/usr/bin/env python3
"""
Management script — wipe existing accounts and create a pro-tier admin.

Usage:
  python create_admin.py <email> <password>
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from database import engine, create_db
from db_models import User, UserData
from auth import hash_password


def main():
    if len(sys.argv) != 3:
        print("Usage: python create_admin.py <email> <password>")
        sys.exit(1)

    email    = sys.argv[1].strip().lower()
    password = sys.argv[2]

    if len(password) < 8:
        print("Error: password must be at least 8 characters")
        sys.exit(1)

    create_db()

    with Session(engine) as session:
        existing = session.exec(select(User)).all()

        if existing:
            print(f"\nExisting accounts ({len(existing)}):")
            for u in existing:
                print(f"  {u.email}  [tier: {u.tier}]")
            ans = input("\nDelete all existing accounts? [y/N] ").strip().lower()
            if ans == 'y':
                for u in existing:
                    data = session.exec(select(UserData).where(UserData.user_id == u.id)).first()
                    if data:
                        session.delete(data)
                    session.delete(u)
                session.commit()
                print(f"Deleted {len(existing)} account(s).\n")

        # Upsert admin
        admin = session.exec(select(User).where(User.email == email)).first()
        if admin:
            admin.password_hash = hash_password(password)
            admin.tier     = 'pro'
            admin.is_admin = True
            session.commit()
            print(f"Updated existing account → pro admin: {email}")
        else:
            admin = User(email=email, password_hash=hash_password(password), tier='pro', is_admin=True)
            session.add(admin)
            session.commit()
            session.refresh(admin)
            session.add(UserData(user_id=admin.id))
            session.commit()
            print(f"Created admin account: {email}  [tier: pro, is_admin: true]")


if __name__ == '__main__':
    main()
