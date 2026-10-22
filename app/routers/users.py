from typing import Optional,List
from fastapi import Depends, FastAPI, status,Response,HTTPException, APIRouter
from .. import models , schema, utils
from ..databases import engine, get_db
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schema.Userresponse)
def create_user(user: schema.Userbase, db: Session = Depends(get_db)):
    user.password = utils.hash_password(user.password)
    new_user = models.User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/{id}", response_model=schema.Userresponse)
def get_user(id: int, db: Session = Depends(get_db)):
    get_user = db.query(models.User).filter(models.User.id == id).first()
    if not get_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"user with id {id} not found")
    return get_user