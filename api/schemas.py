"""schemas.py — Contrats d'entrée de l'API (validation pydantic aux frontières)."""
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

Likert = Annotated[int, Field(ge=1, le=5)]
QuestionId = Annotated[str, Field(max_length=10)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ResponsesIn(_Strict):
    responses: dict[QuestionId, Likert] = Field(max_length=50)


class ReportIn(ResponsesIn):
    organization: str | None = Field(default=None, max_length=120)
    sector: str | None = Field(default=None, max_length=60)


class RegisterIn(_Strict):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
    organization: str = Field(max_length=120)
    sector: str | None = Field(default=None, max_length=60)
    consent: bool


class LoginIn(_Strict):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
