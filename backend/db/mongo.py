import motor.motor_asyncio
from dotenv import load_dotenv
import os

load_dotenv("../.env")

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "biz_data"

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
db['users'].insert_one({'data':'hi'})