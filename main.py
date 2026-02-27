from __future__ import annotations

from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.init_db import init_db
from app.models import Article, Category, ContactMessage, User, UserSession
from app.schemas import (
    ArticleDetailOut,
    ArticleListOut,
    ArticleCategoryOut,
    ArticlesResponse,
    AuthLoginRequest,
    AuthSignupRequest,
    AuthTokenResponse,
    CategoryOut,
    CategoryWithCountOut,
    ContactRequest,
    ContactResponse,
    LogoutResponse,
    UserOut,
)
from app.security import generate_access_token, hash_text, token_expiry

app = FastAPI()
auth_scheme = HTTPBearer(auto_error=False)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/")
async def root():
    return {"message": "Investopedia API is running"}


def _article_to_list_out(article: Article) -> ArticleListOut:
    return ArticleListOut(
        id=article.id,
        title=article.title,
        slug=article.slug,
        summary=article.summary,
        is_featured=article.is_featured,
        published_at=article.published_at,
        category=ArticleCategoryOut(
            id=article.category.id,
            name=article.category.name,
            slug=article.category.slug,
        ),
    )


def _article_to_detail_out(article: Article) -> ArticleDetailOut:
    return ArticleDetailOut(
        id=article.id,
        title=article.title,
        slug=article.slug,
        summary=article.summary,
        content=article.content,
        cover_image_url=article.cover_image_url,
        is_featured=article.is_featured,
        status=article.status,
        published_at=article.published_at,
        category=ArticleCategoryOut(
            id=article.category.id,
            name=article.category.name,
            slug=article.category.slug,
        ),
    )


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> UserSession:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token.",
        )

    token_hash = hash_text(credentials.credentials)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.token_hash == token_hash,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > datetime.now(),
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return session


def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for this session.",
        )
    return user


@app.post("/api/auth/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: AuthSignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password=payload.password,
        hashed_password=hash_text(payload.password),
    )
    db.add(user)
    db.flush()

    raw_token = generate_access_token()
    expires_at = token_expiry()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_text(raw_token),
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(session)
    db.commit()
    db.refresh(user)

    return AuthTokenResponse(
        access_token=raw_token,
        token_type="bearer",
        expires_at=expires_at,
        user=UserOut.model_validate(user),
    )


@app.post("/api/auth/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or user.hashed_password != hash_text(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password."
        )

    raw_token = generate_access_token()
    expires_at = token_expiry()
    session = UserSession(
        user_id=user.id,
        token_hash=hash_text(raw_token),
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(session)
    db.commit()

    return AuthTokenResponse(
        access_token=raw_token,
        token_type="bearer",
        expires_at=expires_at,
        user=UserOut.model_validate(user),
    )


@app.post("/api/auth/logout", response_model=LogoutResponse)
def logout(session: UserSession = Depends(get_current_session), db: Session = Depends(get_db)):
    session.is_revoked = True
    db.add(session)
    db.commit()
    return LogoutResponse(message="Logged out successfully.")


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@app.get("/api/categories", response_model=list[CategoryWithCountOut])
def list_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(Category, func.count(Article.id))
        .outerjoin(Article, Category.id == Article.category_id)
        .group_by(Category.id)
        .order_by(Category.name.asc())
        .all()
    )
    return [
        CategoryWithCountOut(
            id=category.id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            icon=category.icon,
            article_count=article_count,
        )
        for category, article_count in rows
    ]


@app.get("/api/categories/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return CategoryOut.model_validate(category)


@app.get("/api/articles", response_model=ArticlesResponse)
def list_articles(
    category: str | None = Query(default=None, description="Category slug"),
    search: str | None = Query(default=None, description="Search in title/summary/content"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Article)
        .join(Category, Category.id == Article.category_id)
        .options(joinedload(Article.category))
        .filter(Article.status == "published")
    )

    if category:
        query = query.filter(Category.slug == category)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Article.title.ilike(term),
                Article.summary.ilike(term),
                Article.content.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    records = (
        query.order_by(Article.published_at.desc(), Article.id.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return ArticlesResponse(
        page=page,
        page_size=page_size,
        total=total,
        items=[_article_to_list_out(article) for article in records],
    )


@app.get("/api/articles/{slug}", response_model=ArticleDetailOut)
def get_article(slug: str, db: Session = Depends(get_db)):
    article = (
        db.query(Article)
        .options(joinedload(Article.category))
        .filter(Article.slug == slug, Article.status == "published")
        .first()
    )
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    return _article_to_detail_out(article)


@app.get("/api/featured", response_model=list[ArticleListOut])
def get_featured(
    limit: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    records = (
        db.query(Article)
        .options(joinedload(Article.category))
        .filter(Article.is_featured.is_(True), Article.status == "published")
        .order_by(Article.published_at.desc(), Article.id.desc())
        .limit(limit)
        .all()
    )
    return [_article_to_list_out(article) for article in records]


@app.post("/api/contact", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactRequest, db: Session = Depends(get_db)):
    record = ContactMessage(
        name=payload.name.strip(),
        email=payload.email.lower(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return ContactResponse(
        id=record.id,
        message="Your message has been received.",
        created_at=record.created_at,
    )
