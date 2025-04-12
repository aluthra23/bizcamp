from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import db
from bson import ObjectId #vedant import

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

@app.post("/departments")
async def add_department(request: Request):
    data = await request.json()
    # Add the company_id if not provided
    if "company_id" not in data:
        data["company_id"] = "67fa9eb53d8faa5288cf5a43"
    
    # Insert the department
    result = db["departments"].insert_one(data)
    
    # Return the created department with string ID
    created_department = {
        **data,
        "_id": str(result.inserted_id)
    }
    return created_department

@app.get("/departments")
async def get_departments():
    # Get all departments for the company
    company_id = "67fa9eb53d8faa5288cf5a43"
    departments = list(db["departments"].find({"company_id": company_id}))
    
    # Convert ObjectId to string
    for dept in departments:
        dept["_id"] = str(dept["_id"])
    
    return departments

@app.delete("/departments/{department_id}")
async def delete_department(department_id: str):
    try:
        # Convert string ID to ObjectId
        result = db["departments"].delete_one({"_id": ObjectId(department_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Department not found")
            
        return {"success": True, "message": "Department deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting department: {str(e)}")
