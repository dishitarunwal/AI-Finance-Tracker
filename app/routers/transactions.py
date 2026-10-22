from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app import ai_agent, models, schema
from app.databases import get_db
from typing import List, Optional
from datetime import datetime, timedelta
from app.oauth2 import get_current_user
from sqlalchemy import func, case
# pyrefly: ignore [missing-import]
import redis
import json
import logging

logger = logging.getLogger(__name__)

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

router = APIRouter(
    prefix="/transactions",
    tags=['Transactions']
)
@router.get("/", status_code=status.HTTP_200_OK,response_model=List[schema.transactionresponse])
def get_transactions(limit:int = 10, search: Optional[str] = None,sort_by: Optional[str] = "desc", 
                    skip:int=0,db: Session = Depends(get_db), 
                     current_user: schema.Userresponse = Depends(get_current_user)):
    query = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id)
    if search:
        query = query.filter(models.Transaction.description.contains(search))
    if sort_by == "asc":
        query = query.order_by(models.Transaction.date.asc())
    else:
        query = query.order_by(models.Transaction.date.desc())
    transactions = query.offset(skip).limit(limit).all()
    return transactions    

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schema.transactionresponse)
def create_transaction(transaction: schema.transactionbse, db: Session = Depends(get_db), current_user: schema.Userresponse = Depends(get_current_user)):
    # Treat category_id of 0 as None to avoid foreign key constraint errors
    final_category_id = transaction.category_id if transaction.category_id not in [None, 0] else None
    ai_confidence = 0.0
    needs_review = False
    is_ai = False
    if final_category_id is None:
        print(f"[AI] Analyzing: {transaction.description}")
        ai_result = ai_agent.predict_category(transaction.description)
        if ai_result['id'] != 0:
            final_category_id = ai_result['id']
            ai_confidence = ai_result['confidence']
            is_ai = True
            if ai_confidence < 0.75:
                needs_review = True
        else:
            final_category_id = None
    new_transaction = models.Transaction(
        owner_id=current_user.id,
        amount=transaction.amount,
        description=transaction.description,
        category_id=final_category_id,
        is_ai_categorized=is_ai,
        ai_confidence=ai_confidence, # New Field
        needs_review=needs_review    # New Field
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    try:
        redis_client.delete(f"summary:{current_user.id}")
    except redis.exceptions.RedisError as e:
        logger.warning(f"Redis cache invalidation failed: {e}")
    return new_transaction

@router.get("/stats", status_code=status.HTTP_200_OK, response_model=schema.transactionstats)
def get_transaction_stats(db: Session = Depends(get_db),
                          start_date: Optional[datetime] = None,
                          end_date: Optional[datetime] = None,
                          current_user: schema.Userresponse = Depends(get_current_user)):
    my_transactions = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id)
    if start_date:
        my_transactions = my_transactions.filter(models.Transaction.date >= start_date)
    if end_date:
        my_transactions = my_transactions.filter(models.Transaction.date <= end_date)
    stats = my_transactions.with_entities(
        func.sum(case((models.Transaction.amount > 0, models.Transaction.amount), else_=0)).label("income"),
        func.sum(case((models.Transaction.amount < 0, models.Transaction.amount), else_=0)).label("expense"),
        func.sum(models.Transaction.amount).label("net")
    ).first()
    total_income = stats.income or 0
    total_expenditure = stats.expense or 0
    net_balance = stats.net or 0

    return schema.transactionstats(
        total_income=total_income,total_expenditure=abs(total_expenditure), net_balance=net_balance
    )

@router.get("/custom_stats", status_code=status.HTTP_200_OK, response_model=schema.monthyearlystats)
def get_monthly_stats(db: Session = Depends(get_db),
                          month: Optional[int] = None,
                          year: Optional[int] = None,
                          current_user: schema.Userresponse = Depends(get_current_user)):
    my_transactions = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id)
    if year:
        my_transactions = my_transactions.filter(func.extract('year', models.Transaction.date) == year)
    if month:
        my_transactions = my_transactions.filter(func.extract('month', models.Transaction.date) == month)
    stats = my_transactions.with_entities(
        func.sum(case((models.Transaction.amount > 0, models.Transaction.amount), else_=0)).label("income"),
        func.sum(case((models.Transaction.amount < 0, models.Transaction.amount), else_=0)).label("expense"),
        func.sum(models.Transaction.amount).label("net")
    ).first()
    total_income = stats.income or 0
    total_expenditure = stats.expense or 0
    net_balance = stats.net or 0
    return schema.monthyearlystats(
        month=month,year=year, total_income=total_income,
        total_expenditure=abs(total_expenditure), net_balance=net_balance
    )

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(id: int, db: Session = Depends(get_db),
                       current_user: schema.Userresponse = Depends(get_current_user)):
    transaction_query = db.query(models.Transaction).filter(models.Transaction.id == id)
    transaction = transaction_query.first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"transaction with id {id} not found")
    if transaction.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform requested action")
    transaction_query.delete(synchronize_session=False)
    db.commit()
    try:
        redis_client.delete(f"summary:{current_user.id}")
    except redis.exceptions.RedisError as e:
        logger.warning(f"Redis cache invalidation failed: {e}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.put("/{id}", status_code=status.HTTP_200_OK, response_model=schema.transactionresponse)
def update_transaction(id: int, updated_transaction: schema.transactionbse, db: Session = Depends(get_db), 
                       current_user: schema.Userresponse = Depends(get_current_user)):
    transaction_query = db.query(models.Transaction).filter(models.Transaction.id == id)
    transaction = transaction_query.first()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"transaction with id {id} not found")
    if transaction.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform requested action")
    transaction_query.update(updated_transaction.dict(), synchronize_session=False)
    db.commit()
    try:
        redis_client.delete(f"summary:{current_user.id}")
    except redis.exceptions.RedisError as e:
        logger.warning(f"Redis cache invalidation failed: {e}")
    return transaction_query.first()

@router.get("/summary", status_code=status.HTTP_200_OK, response_model=schema.transactionstats)
def get_summary(db: Session = Depends(get_db), current_user: schema.Userresponse = Depends(get_current_user)):
    cache_key = f"summary:{current_user.id}"
    
    # Cache-Aside logic: Attempt to get from Redis, fallback to DB if Redis is down
    try:
        cached_summary = redis_client.get(cache_key)
        if cached_summary:
            return json.loads(cached_summary)
    except redis.exceptions.RedisError as e:
        logger.warning(f"Redis operation failed: {e}. Falling back to PostgreSQL.")
        
    stats = db.query(models.Transaction).filter(models.Transaction.owner_id == current_user.id).with_entities(
        func.sum(case((models.Transaction.amount > 0, models.Transaction.amount), else_=0)).label("income"),
        func.sum(case((models.Transaction.amount < 0, models.Transaction.amount), else_=0)).label("expense"),
        func.sum(models.Transaction.amount).label("net")
    ).first()
    
    total_income = stats.income or 0
    total_expenditure = stats.expense or 0
    net_balance = stats.net or 0
    
    result = {
        "total_income": total_income,
        "total_expenditure": abs(total_expenditure),
        "net_balance": net_balance
    }
    
    try:
        # Cache the result for 5 minutes
        redis_client.setex(cache_key, 300, json.dumps(result))
    except redis.exceptions.RedisError as e:
        logger.warning(f"Redis set cache failed: {e}")
    
    return result
