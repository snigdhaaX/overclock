"""Importing this package registers every table on the shared metadata."""
from ..blockchain import database as _blockchain_tables  # noqa: F401
from ..risk import models as _risk_tables  # noqa: F401
from . import governance, identity, integrations, intelligence, inventory, recovery, supply_chain  # noqa: F401
from .base import Base

__all__ = ["Base"]
