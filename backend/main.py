from fastapi import FastAPI, Request
from db.mongo import db

app = FastAPI()
users_collection = db["users"]

@app.post("/add-user")
async def add_user(request: Request):
    data = await request.json()
    # Example expected: { "name": "Alice", "email": "alice@example.com" }
    result = await users_collection.insert_one(data)
    return {"inserted_id": str(result.inserted_id)}
