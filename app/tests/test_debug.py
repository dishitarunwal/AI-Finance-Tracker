import os
import pytest

def test_debug_print():
    pwd = os.getenv("DATABASE_PASSWORD")
    print("\nXXX_PASSWORD_XXX:", repr(pwd))
    
    # Also verify that it connects properly
    from sqlalchemy import create_engine, URL
    url = URL.create(
        "postgresql+psycopg2",
        username=os.getenv("DATABASE_USERNAME"),
        password=pwd,
        host=os.getenv("DATABASE_HOSTNAME"),
        database="postgres"
    )
    print("XXX_URL_XXX:", str(url))
    e = create_engine(url)
    try:
        e.connect()
        print("XXX_CONNECT_OK_XXX")
    except Exception as ex:
        print("XXX_EX_XXX:", repr(ex))
