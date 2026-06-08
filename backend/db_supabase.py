"""Supabase Postgres compatibility shim.

Goal: keep all existing route code (`db.users.find_one(...)`, `db.orders.insert_one(...)`,
`db.users.update_one({...}, {"$set": {...}, "$inc": {...}}, upsert=True)`, etc.)
working **unchanged** but now backed by Supabase Postgres instead of MongoDB.

We use the synchronous `supabase` Python client wrapped in `asyncio.to_thread`
so the public methods stay coroutines and slot straight into the existing
FastAPI handlers.

Supported translations:
  • `find_one(query, projection=None)`              → SELECT … LIMIT 1
  • `find(query, projection=None).sort(...).to_list(n)` → SELECT … ORDER BY … LIMIT n
  • `insert_one(doc)`                               → INSERT
  • `update_one(query, update, upsert=False)`       → UPDATE / UPSERT
        - supports `$set` (assignment), `$inc` (via RPC), and combinations
  • `count_documents(query)`                        → SELECT count(*)
  • `aggregate(pipeline).to_list(n)`                → only the small set of
        pipelines we actually use today (admin revenue sum). Add cases as needed.

Mongo query operators handled in WHERE clauses:
  • exact match           {"k": v}
  • `$in`                 {"k": {"$in": [...]}}
  • `$ne`                 {"k": {"$ne": v}}
  • `$exists` (limited)   {"k": {"$exists": True}}
"""
import os
import asyncio
import logging
from typing import Any, Optional

from supabase import create_client, Client

logger = logging.getLogger("db_supabase")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

_client: Optional[Client] = None


def _sb() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ----------------------------------------------------------------------
# Query / filter translation
# ----------------------------------------------------------------------
def _apply_filters(q, query: dict):
    """Apply a Mongo-style query dict onto a supabase query builder."""
    for k, v in (query or {}).items():
        if isinstance(v, dict):
            if "$in" in v:
                q = q.in_(k, list(v["$in"]))
            elif "$ne" in v:
                q = q.neq(k, v["$ne"])
            elif "$exists" in v:
                if v["$exists"]:
                    q = q.not_.is_(k, "null")
                else:
                    q = q.is_(k, "null")
            elif "$gte" in v:
                q = q.gte(k, v["$gte"])
            elif "$lte" in v:
                q = q.lte(k, v["$lte"])
            elif "$gt" in v:
                q = q.gt(k, v["$gt"])
            elif "$lt" in v:
                q = q.lt(k, v["$lt"])
            else:
                # Unknown operator — best-effort exact match
                q = q.eq(k, v)
        else:
            q = q.eq(k, v)
    return q


def _projection_to_cols(projection: Optional[dict]) -> str:
    """Translate a Mongo include/exclude projection to a PostgREST select string.

    PostgREST can only *include* columns. If the projection is exclude-style
    (any value is 0), we ignore it and select `*` — the caller will get extra
    columns but never miss any required ones, which matches Mongo's behaviour
    closely enough for our routes.
    """
    if not projection:
        return "*"
    include = [k for k, v in projection.items() if v == 1]
    if include:
        return ",".join(include)
    return "*"


def _drop_id(doc: dict) -> dict:
    """Mongo's _id is always stripped in our routes; mimic by returning the row as-is."""
    if doc is None:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return d


# ----------------------------------------------------------------------
# Cursor
# ----------------------------------------------------------------------
class _Cursor:
    def __init__(self, table: str, query: dict, projection: Optional[dict]):
        self.table = table
        self.query = query
        self.projection = projection
        self._sort: list[tuple[str, int]] = []
        self._limit: Optional[int] = None
        self._skip: int = 0

    def sort(self, key, direction=1):
        if isinstance(key, list):
            self._sort.extend(key)
        else:
            self._sort.append((key, direction))
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def skip(self, n: int):
        self._skip = n
        return self

    async def to_list(self, n: Optional[int] = None):
        cols = _projection_to_cols(self.projection)

        def _run():
            q = _sb().table(self.table).select(cols)
            q = _apply_filters(q, self.query)
            for col, direction in self._sort:
                q = q.order(col, desc=(direction == -1))
            limit = self._limit if self._limit is not None else n
            if limit is not None:
                q = q.limit(limit)
            if self._skip:
                q = q.offset(self._skip)
            return q.execute()

        res = await asyncio.to_thread(_run)
        return [_drop_id(r) for r in (res.data or [])]


# ----------------------------------------------------------------------
# Aggregation (only the patterns we need)
# ----------------------------------------------------------------------
class _AggResult:
    def __init__(self, data):
        self.data = data

    async def to_list(self, _n=None):
        return self.data


# ----------------------------------------------------------------------
# Collection
# ----------------------------------------------------------------------
class _Collection:
    def __init__(self, name: str):
        self.name = name

    async def find_one(self, query: dict, projection: Optional[dict] = None, sort: Optional[list] = None):
        cols = _projection_to_cols(projection)

        def _run():
            q = _sb().table(self.name).select(cols)
            q = _apply_filters(q, query)
            if sort:
                for col, direction in sort:
                    q = q.order(col, desc=(direction == -1))
            return q.limit(1).execute()

        res = await asyncio.to_thread(_run)
        rows = res.data or []
        return _drop_id(rows[0]) if rows else None

    def find(self, query: dict | None = None, projection: Optional[dict] = None):
        return _Cursor(self.name, query or {}, projection)

    async def insert_one(self, doc: dict):
        clean = dict(doc)
        clean.pop("_id", None)

        def _run():
            return _sb().table(self.name).insert(clean).execute()

        return await asyncio.to_thread(_run)

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        set_part = update.get("$set", {}) or {}
        inc_part = update.get("$inc", {}) or {}
        unset_part = update.get("$unset", {}) or {}

        # Apply $unset as a "set this field to NULL".
        for k in unset_part.keys():
            set_part[k] = None

        # ---------- 1. find the existing row ----------
        def _find():
            q = _sb().table(self.name).select("*")
            q = _apply_filters(q, query)
            return q.limit(1).execute()

        res = await asyncio.to_thread(_find)
        existing = (res.data or [None])[0]

        if not existing:
            # ---------- 2a. upsert insert path ----------
            if not upsert:
                return res
            new_doc = dict(query)
            new_doc.update(set_part)
            for k, v in inc_part.items():
                new_doc[k] = (new_doc.get(k) or 0) + v

            def _insert():
                return _sb().table(self.name).insert(new_doc).execute()

            return await asyncio.to_thread(_insert)

        # ---------- 2b. update path ----------
        # Build the update dict
        merged: dict[str, Any] = dict(set_part)
        for k, v in inc_part.items():
            current = existing.get(k) or 0
            merged[k] = current + v

        if not merged:
            return res

        # Determine the primary key for the update — most of our collections
        # are keyed by something other than supabase_user_id (orders by
        # razorpay_order_id, applications by id, etc.). We just re-use the
        # original query, which always uniquely identifies a row in our
        # current usage.
        def _update():
            q = _sb().table(self.name).update(merged)
            q = _apply_filters(q, query)
            return q.execute()

        return await asyncio.to_thread(_update)

    async def delete_one(self, query: dict):
        def _run():
            q = _sb().table(self.name).delete()
            q = _apply_filters(q, query)
            return q.execute()

        return await asyncio.to_thread(_run)

    async def count_documents(self, query: dict | None = None):
        def _run():
            q = _sb().table(self.name).select("supabase_user_id", count="exact")
            q = _apply_filters(q, query or {})
            return q.execute()

        res = await asyncio.to_thread(_run)
        return res.count or 0

    def aggregate(self, pipeline: list[dict]):
        """Only the pipelines we actually use today are supported.

        Currently: a single `$match` + `$group _id=None, total: $sum` on
        the orders table (the admin revenue calculation).
        """
        match_stage = next((s.get("$match", {}) for s in pipeline if "$match" in s), {})
        group_stage = next((s.get("$group", {}) for s in pipeline if "$group" in s), {})

        async def _run_async():
            def _run():
                q = _sb().table(self.name).select("*")
                q = _apply_filters(q, match_stage)
                return q.execute()

            res = await asyncio.to_thread(_run)
            rows = res.data or []
            # Determine the field to sum from $group: e.g. {"total": {"$sum": "$amount"}}
            total = 0
            for key, op in group_stage.items():
                if isinstance(op, dict) and "$sum" in op:
                    field = op["$sum"].lstrip("$") if isinstance(op["$sum"], str) else None
                    if field:
                        total = sum((r.get(field) or 0) for r in rows)
                    else:
                        total = len(rows)
            return [{"total": total}]

        class _Lazy:
            def __init__(self): pass
            async def to_list(self, _n=None):
                return await _run_async()

        return _Lazy()


# ----------------------------------------------------------------------
# DB facade — mirror Mongo's `db.<collection_name>` attribute access
# ----------------------------------------------------------------------
class _DB:
    def __init__(self):
        self._collections: dict[str, _Collection] = {}

    def __getattr__(self, name: str) -> _Collection:
        if name.startswith("_"):
            raise AttributeError(name)
        col = self._collections.get(name)
        if col is None:
            col = _Collection(name)
            self._collections[name] = col
        return col


_DB_INSTANCE: Optional[_DB] = None


def get_db() -> _DB:
    global _DB_INSTANCE
    if _DB_INSTANCE is None:
        _DB_INSTANCE = _DB()
    return _DB_INSTANCE


def close():
    """Mongo had a connection to close; supabase-py uses HTTP, nothing to do."""
    pass


def ping() -> bool:
    """Lightweight liveness check for the /api/health endpoint."""
    try:
        _sb().table("users").select("supabase_user_id").limit(1).execute()
        return True
    except Exception as e:
        logger.warning(f"Supabase ping failed: {e}")
        return False
