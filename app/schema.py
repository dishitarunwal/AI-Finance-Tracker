
from pydantic import BaseModel, EmailStr
from typing import Optional
import datetime

class Userresponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class Userbase(BaseModel):
    name: str
    email: EmailStr
    password: str
    
class Userlogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None    

class transactionbse(BaseModel):
    amount: float
    description: str
    date: datetime.datetime = datetime.datetime.now() 
    category_id: Optional[int] = None

class transactionresponse(transactionbse):
    id: int
    owner_id: int
    is_ai_categorized: bool
    class Config:
        from_attributes = True

class expenditure(transactionbse):
    pass

class transactionstats(BaseModel):
    total_income: float
    total_expenditure: float
    net_balance: float

    class Config:
        from_attributes = True

class monthyearlystats(transactionstats):
    month: Optional[int] = None
    year: Optional[int] = None

    class Config:
        from_attributes = True