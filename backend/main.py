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

@app.get("/departments/{department_id}/teams")
async def get_teams_by_department(department_id: str):
    try:
        teams = list(db["teams"].find({"departmentId": department_id}))
        print(teams)
        for team in teams:
            team["_id"] = str(team["_id"])
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/departments/{department_id}/teams")
async def add_team(department_id: str, request: Request):
    data = await request.json()
    data["departmentId"] = department_id
    result = db["teams"].insert_one(data)
    return {"inserted_id": str(result.inserted_id)}

@app.get("/teams/{team_id}/meetings")
async def get_meetings_by_team(team_id: str):
    try:
        meetings = list(db["meetings"].find({"teamId": team_id}))
        print(meetings)
        # Convert ObjectId to string
        for meeting in meetings:
            meeting["_id"] = str(meeting["_id"])
        return meetings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/teams/{team_id}/meetings")
async def add_meeting(team_id: str, request: Request):
    try:
        data = await request.json()
        data["teamId"] = team_id
        result = db["meetings"].insert_one(data)
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/meetings/{meeting_id}")
async def get_meeting_by_id(meeting_id: str):
    try:
        # Convert string ID to ObjectId
        meeting = db["meetings"].find_one({"_id": ObjectId(meeting_id)})
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Convert ObjectId to string
        meeting["_id"] = str(meeting["_id"])
        
        return meeting
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving meeting: {str(e)}")

@app.get("/teams/{team_id}")
async def get_team_by_id(team_id: str):
    try:
        # Convert string ID to ObjectId
        team = db["teams"].find_one({"_id": ObjectId(team_id)})
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Convert ObjectId to string
        team["_id"] = str(team["_id"])
        
        return team
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid team ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving team: {str(e)}")
