from __future__ import annotations

from datetime import datetime, timedelta
import hashlib

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Article, Category, ContactMessage, User, UserSession


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def seed_data(db: Session) -> None:
    # Reset existing data in dependency-safe order.
    db.query(UserSession).delete()
    db.query(Article).delete()
    db.query(ContactMessage).delete()
    db.query(User).delete()
    db.query(Category).delete()
    db.commit()

    now = datetime.now()

    users = [
        User(
            name="Aarav Sharma",
            email="aarav@example.com",
            password="Aarav@123",
            hashed_password=_sha256("Aarav@123"),
        ),
        User(
            name="Riya Kapoor",
            email="riya@example.com",
            password="Riya@123",
            hashed_password=_sha256("Riya@123"),
        ),
        User(
            name="Vikram Patel",
            email="vikram@example.com",
            password="Vikram@123",
            hashed_password=_sha256("Vikram@123"),
        ),
    ]
    db.add_all(users)
    db.flush()

    sessions = [
        UserSession(
            user_id=users[0].id,
            token_hash=_sha256("session-aarav-1"),
            expires_at=now + timedelta(days=7),
            is_revoked=False,
        ),
        UserSession(
            user_id=users[1].id,
            token_hash=_sha256("session-riya-1"),
            expires_at=now + timedelta(days=7),
            is_revoked=False,
        ),
        UserSession(
            user_id=users[2].id,
            token_hash=_sha256("session-vikram-1"),
            expires_at=now + timedelta(days=7),
            is_revoked=True,
        ),
    ]
    db.add_all(sessions)

    categories = [
        Category(
            name="Stocks",
            slug="stocks",
            description="Guides and updates about stock market investing.",
            icon="chart-line",
        ),
        Category(
            name="Gold",
            slug="gold",
            description="Gold investing basics, trends, and pricing context.",
            icon="coins",
        ),
        Category(
            name="Silver",
            slug="silver",
            description="Silver market movement, volatility, and strategy basics.",
            icon="circle-dollar-sign",
        ),
        Category(
            name="Mutual Funds",
            slug="mutual-funds",
            description="Fund categories, return interpretation, and SIP guidance.",
            icon="wallet-cards",
        ),
        Category(
            name="Market News",
            slug="market-news",
            description="Concise market-moving developments and macro signals.",
            icon="newspaper",
        ),
        Category(
            name="Beginner Guides",
            slug="beginner-guides",
            description="Simple learning path for new investors.",
            icon="book-open",
        ),
    ]
    db.add_all(categories)
    db.flush()

    category_map = {c.slug: c.id for c in categories}

    articles = [
        Article(
            category_id=category_map["market-news"],
            title="Sensex Drops Around 600 Points: What Beginners Should Check First",
            slug="sensex-down-600-beginner-checklist",
            summary="A quick checklist to avoid panic decisions during broad market declines.",
            content=(
                "Markets can fall sharply due to global risk signals, policy uncertainty, or sector-level selling. "
                "When headline indices decline, beginners should review asset allocation, avoid fresh leverage, "
                "and focus on staggered investing in quality assets."
            ),
            is_featured=True,
            published_at=now - timedelta(days=1),
        ),
        Article(
            category_id=category_map["gold"],
            title="Gold Prices Rising: Key Drivers You Should Understand",
            slug="gold-price-rally-key-drivers",
            summary="Geopolitical risk, debt concerns, and central bank buying can support gold demand.",
            content=(
                "Gold often strengthens during uncertainty. Track three inputs: global risk events, real interest rates, "
                "and central bank purchase trends. Gold can improve diversification but should usually be one part "
                "of a broader plan."
            ),
            is_featured=True,
            published_at=now - timedelta(days=2),
        ),
        Article(
            category_id=category_map["silver"],
            title="Silver Rate Volatility: How to Handle Sharp Price Swings",
            slug="silver-volatility-investor-guide",
            summary="Silver can move faster than gold due to industrial demand and speculative flows.",
            content=(
                "Silver is typically more volatile than gold. Position sizing, gradual entry, and clear holding "
                "horizon are critical. Short-term moves can be large, so avoid over-allocating based on one-day momentum."
            ),
            is_featured=False,
            published_at=now - timedelta(days=2),
        ),
        Article(
            category_id=category_map["stocks"],
            title="IT Sector and AI Transition: Opportunity With Volatility",
            slug="it-sector-ai-transition-opportunity-risk",
            summary="AI-led demand may rise, but transition phases can create earnings and valuation uncertainty.",
            content=(
                "Several market voices suggest AI will reshape business models across IT services. Investors should "
                "separate durable cash-generating firms from speculative narratives and use long-term assumptions "
                "instead of news-driven trades."
            ),
            is_featured=True,
            published_at=now - timedelta(days=3),
        ),
        Article(
            category_id=category_map["mutual-funds"],
            title="How to Read Mutual Fund Returns Correctly",
            slug="how-to-read-mutual-fund-returns-cagr-xirr",
            summary="Understand CAGR, XIRR, and absolute return before comparing funds.",
            content=(
                "Use CAGR for point-to-point annualized growth, XIRR for staggered SIP cashflows, and absolute return "
                "for short windows. Compare funds against relevant benchmarks and category peers over similar periods."
            ),
            is_featured=False,
            published_at=now - timedelta(days=4),
        ),
        Article(
            category_id=category_map["mutual-funds"],
            title="Sample Equity Funds and Recent Return Snapshot",
            slug="sample-equity-funds-return-snapshot",
            summary="Curated examples from commonly discussed direct plans.",
            content=(
                "Examples frequently discussed include Motilal Oswal Midcap Fund (5Y 24.04%), "
                "Motilal Oswal Large and Midcap (5Y 21.56%), HSBC Mid Cap Fund (5Y 20.19%), "
                "and Axis Small Cap Fund (5Y 21.12%). Treat past returns as reference, not guarantee."
            ),
            is_featured=True,
            published_at=now - timedelta(days=5),
        ),
        Article(
            category_id=category_map["mutual-funds"],
            title="ETF Basics: Nifty Index, Gold, and Silver Exposure",
            slug="etf-basics-index-gold-silver",
            summary="How investors use low-cost index and commodity-linked funds.",
            content=(
                "ETF-style products can provide broad index exposure or commodity-linked access. "
                "Examples include Nifty index funds, gold-linked funds, and silver fund-of-funds. "
                "Check tracking error, expense ratio, and liquidity before choosing."
            ),
            is_featured=False,
            published_at=now - timedelta(days=6),
        ),
        Article(
            category_id=category_map["beginner-guides"],
            title="Beginner Path: Start Investing in 5 Practical Steps",
            slug="beginner-investing-5-step-path",
            summary="A structured path from emergency fund to disciplined investing.",
            content=(
                "Step 1: Build emergency savings. Step 2: Define time horizon and risk level. "
                "Step 3: Start with diversified products. Step 4: Add gold/silver cautiously for diversification. "
                "Step 5: Review monthly without overreacting to daily news."
            ),
            is_featured=True,
            published_at=now - timedelta(days=7),
        ),
        Article(
            category_id=category_map["market-news"],
            title="Nifty and Sector Heatmap: How to Read Market Breadth",
            slug="nifty-sector-heatmap-market-breadth",
            summary="Index points alone are not enough; sector and advance-decline data matter.",
            content=(
                "A falling index with weak advance-decline figures indicates broad selling pressure. "
                "If only a few sectors fall while others hold up, risk may be more concentrated. "
                "Use breadth to avoid overgeneralizing one-day index moves."
            ),
            is_featured=False,
            published_at=now - timedelta(days=1, hours=8),
        ),
        Article(
            category_id=category_map["gold"],
            title="Gold in a Portfolio: Why Allocation Discipline Matters",
            slug="gold-allocation-discipline",
            summary="Gold can hedge uncertainty but should not dominate the portfolio.",
            content=(
                "Gold is useful for diversification, inflation uncertainty, and macro risk hedging. "
                "Most investors should keep a defined allocation range and rebalance periodically "
                "instead of chasing sudden rallies."
            ),
            is_featured=False,
            published_at=now - timedelta(days=8),
        ),
    ]
    db.add_all(articles)

    contact_messages = [
        ContactMessage(
            name="Ananya Singh",
            email="ananya@example.com",
            subject="Need beginner roadmap",
            message=(
                "Please share a beginner sequence for learning stocks, gold, and mutual funds "
                "over the next three months."
            ),
        ),
        ContactMessage(
            name="Karan Mehta",
            email="karan@example.com",
            subject="Article suggestion",
            message=(
                "Can you add a simple guide explaining risk levels across equity, debt, "
                "gold, and silver investments?"
            ),
        ),
    ]
    db.add_all(contact_messages)

    db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
    print("Seed data inserted successfully.")
