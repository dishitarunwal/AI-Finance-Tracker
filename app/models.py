from sqlalchemy import Integer, String, DateTime, Column, ForeignKey, Float, Boolean, TIMESTAMP, text
from sqlalchemy.orm import relationship
from datetime import datetime
from .databases import Base 

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    transactions = relationship("Transaction", back_populates="owner")
    categories = relationship("Category", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    date = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    # The AI Magic Column
    is_ai_categorized = Column(Boolean, server_default='FALSE')
    ai_confidence = Column(Float, nullable=True) # e.g. 0.95, 0.40
    needs_review = Column(Boolean, default=False) # The "Review Needed" Flag
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    owner = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
