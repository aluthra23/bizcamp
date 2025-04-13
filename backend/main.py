from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import db
from bson import ObjectId #vedant import
import datetime
from dotenv import load_dotenv
import os
from qdrant_manager import QdrantManager
load_dotenv()

app = FastAPI()

qdrant_manager = QdrantManager(qdrant_api_key=os.getenv('QDRANT_API_KEY'), google_api_key= os.getenv('GOOGLE_API_KEY'), host=os.getenv('QDRANT_LINK'), port=6333)

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
        # Ensure the meeting_date is stored as ISO format string
        # The frontend will send meeting_date as an ISO string that includes both date and time
        # Each meeting will have a default duration of 60 minutes (not stored explicitly)
        data["teamId"] = team_id
        result = db["meetings"].insert_one(data)
        return {"inserted_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    try:
        # Convert string ID to ObjectId
        result = db["meetings"].delete_one({"_id": ObjectId(meeting_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        return {"success": True, "message": "Meeting deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting meeting: {str(e)}")

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

@app.post("/meetings/{meeting_id}/transcription")
async def update_meeting_transcription_status(meeting_id: str, request: Request):
    try:
        data = await request.json()
        
        # Update the meeting with transcription status
        result = db["meetings"].update_one(
            {"_id": ObjectId(meeting_id)},
            {"$set": {"hasTranscription": data.get("hasTranscription", True)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Meeting not found")
            
        return {"success": True, "message": "Meeting transcription status updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating meeting transcription status: {str(e)}")

@app.post("/meetings/{meeting_id}/chat")
async def chat_with_meeting(meeting_id: str, request: Request):
    try:
        data = await request.json()
        user_message = data.get("message", "")
        
        # Mock response for now
        print(meeting_id)
        message = qdrant_manager.chat(collection_name=meeting_id, prompt=user_message)

        response = {
            "message": str(message),
            "meeting_id": meeting_id,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

@app.get("/meetings/{meeting_id}/transcriptions")
async def get_transcriptions(meeting_id: str):
    try:
        # Get transcriptions from Qdrant
        transcriptions = qdrant_manager.get_transcriptions(collection_name=meeting_id)
        
        # Return the transcriptions
        return {"transcriptions": transcriptions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving transcriptions: {str(e)}")

