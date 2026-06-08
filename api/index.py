import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.environ.setdefault("VERCEL", "1")

from mangum import Mangum
from server import app  # noqa: E402

handler = Mangum(app, lifespan="off")
