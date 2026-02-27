from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthSignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=255)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut


class LogoutResponse(BaseModel):
    message: str


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    icon: str | None

    model_config = {"from_attributes": True}


class CategoryWithCountOut(CategoryOut):
    article_count: int


class ArticleCategoryOut(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class ArticleListOut(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None
    cover_image_url: str | None
    is_featured: bool
    published_at: datetime
    category: ArticleCategoryOut


class ArticlesResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[ArticleListOut]


class ArticleDetailOut(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None
    content: str
    cover_image_url: str | None
    is_featured: bool
    status: str
    published_at: datetime
    category: ArticleCategoryOut


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=5000)


class ContactResponse(BaseModel):
    id: int
    message: str
    created_at: datetime
