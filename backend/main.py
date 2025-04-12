from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import db

app = FastAPI()

# Enable CORS (adjust allowed origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 👈 Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/add-user")
async def add_user(request: Request):
    data = await request.json()
    # Example expected: { "name": "Alice", "email": "alice@example.com" }
    result = db["users"].insert_one(data)
    return {"inserted_id": str(result.inserted_id)}
