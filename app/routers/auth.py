from fastapi import APIRouter, Depends, HTTPException, status
from .. import utils
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.databases import get_db
from app.oauth2 import create_access_token
from .. import models, schema
router = APIRouter(
    prefix="/auth",
    tags=['Authentication']
)
@router.post("/login", response_model=schema.Token)
def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_credentials.username).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")
    if(not utils.verify_password(user_credentials.password, db_user.password)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Credentials")
    access_token = create_access_token(data={"user_id": db_user.id})
    return {"access_token": access_token, "token_type": "bearer"}
    