"""Database singleton — now backed by Supabase Postgres.

The public surface (`get_db()`, `close()`) is unchanged so existing route
code keeps working untouched. Under the hood, every collection access is
translated to a Supabase Postgres query via `db_supabase.py`.
"""
from db_supabase import get_db as _sb_get_db, close as _sb_close, ping as _sb_ping  # noqa: F401


def get_db():
    return _sb_get_db()


def close():
    _sb_close()


def ping() -> bool:
    return _sb_ping()
