"""MongoDB connection singleton."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client: AsyncIOMotorClient | None = None
_db = None


def _init():
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        _db = _client[os.environ["DB_NAME"]]
    return _db


def get_db():
    return _init()


def close():
    global _client
    if _client is not None:
        _client.close()
        _client = None
