from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from db.mongo import db
from bson import ObjectId #vedant import
import datetime
from dotenv import load_dotenv
import os
from qdrant_manager import QdrantManager
import base64
from fastapi import UploadFile, File, Form
import io
import pdfplumber
from summarize import Summarizer
import threading
import google.generativeai as genai
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

# Configure Gemini API
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

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

@app.post("/meetings/{meeting_id}/upload-pdf")
async def upload_pdf_to_meeting(meeting_id: str, file: UploadFile = File(...)):
    try:
        # Validate file is a PDF
        if not file.content_type == "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read the entire file content
        pdf_content = await file.read()
        
        # Extract and log text from PDF using pdfplumber
        try:
            with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                for _, page in enumerate(pdf.pages, start=1):
                    
                    # Extract text from the page
                    text = page.extract_text()
                    if text:
                        # Split into lines and print each line with line number
                        lines = text.splitlines()
                        for _, line in enumerate(lines, start=1):
                            if line.strip():  # Skip empty lines
                                # print(f"Line {line_index}: {line.strip()}")
                                qdrant_manager.add_text_pdf(collection_name=meeting_id, text=line.strip())

        except Exception as e:
            print(f"Error extracting PDF content: {str(e)}")
        
        # Verify meeting exists
        meeting = db["meetings"].find_one({"_id": ObjectId(meeting_id)})
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Encode the PDF file as base64 to store in MongoDB
        base64_pdf = base64.b64encode(pdf_content).decode('utf-8')
        
        # Store PDF in MongoDB
        pdf_document = {
            "meeting_id": meeting_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "uploaded_at": datetime.datetime.now().isoformat(),
            "file_content": base64_pdf
        }
        
        result = db["pdf_documents"].insert_one(pdf_document)
        
        # Update the meeting to track associated PDFs
        db["meetings"].update_one(
            {"_id": ObjectId(meeting_id)},
            {"$addToSet": {"pdf_documents": str(result.inserted_id)}}
        )
        
        return {
            "success": True,
            "message": "PDF uploaded successfully",
            "document_id": str(result.inserted_id),
            "filename": file.filename,
            "ok": True
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")

@app.get("/meetings/{meeting_id}/pdf-documents")
async def get_meeting_pdf_documents(meeting_id: str):
    try:
        # Get all PDFs associated with this meeting
        documents = list(db["pdf_documents"].find({"meeting_id": meeting_id}, {"file_content": 0}))
        
        # Convert ObjectIds to strings
        for doc in documents:
            doc["_id"] = str(doc["_id"])
        
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PDF documents: {str(e)}")

@app.get("/pdf-documents/{document_id}")
async def get_pdf_document(document_id: str):
    try:
        # Get the PDF document by ID
        document = db["pdf_documents"].find_one({"_id": ObjectId(document_id)})
        if not document:
            raise HTTPException(status_code=404, detail="PDF document not found")
        
        document["_id"] = str(document["_id"])
        return document
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PDF document: {str(e)}")

@app.delete("/pdf-documents/{document_id}")
async def delete_pdf_document(document_id: str):
    try:
        # Find the document to get the meeting_id
        document = db["pdf_documents"].find_one({"_id": ObjectId(document_id)})
        if not document:
            raise HTTPException(status_code=404, detail="PDF document not found")
        
        meeting_id = document["meeting_id"]
        
        # Delete the document from the pdf_documents collection
        result = db["pdf_documents"].delete_one({"_id": ObjectId(document_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="PDF document not found")
        
        # Update the meeting to remove the reference to the deleted PDF
        db["meetings"].update_one(
            {"_id": ObjectId(meeting_id)},
            {"$pull": {"pdf_documents": document_id}}
        )
        
        return {"success": True, "message": "PDF document deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting PDF document: {str(e)}")

@app.get("/meetings/{meeting_id}/conceptgraph")
async def get_concept_graph(meeting_id: str):
   try:
       # Generate concept graph from transcriptions
       concept_graph = qdrant_manager.generate_concept_graph(collection_name=meeting_id)
      
       # Return the concept graph
       return {"conceptgraph": concept_graph}
   except Exception as e:
       raise HTTPException(status_code=500, detail=f"Error retrieving concept graph: {str(e)}")

@app.get("/meetings/{meeting_id}/summary")
async def get_summary(meeting_id: str):
    # Start a completely separate thread for summarization
    # This is more isolated than background_tasks and won't block the main application
    thread = threading.Thread(target=run_generate_summary, args=(meeting_id,))
    thread.daemon = True  # Set as daemon so it doesn't prevent app shutdown
    thread.start()
    
    # Return immediately
    return {"success": True, "message": "Summary generation started in separate thread"}

# Function to generate action items from summary using Gemini
def generate_action_items(summary):
    try:
        # Configure the model
        model = genai.GenerativeModel('gemini-pro')
        
        # Create a prompt for generating 2 short action items
        prompt = f"""
        Based on the following meeting summary, generate exactly 2 action items.
        Each action item must be 4 words maximum and should be clear, actionable tasks.
        Format your response as a JSON array with objects that have 'description' field.
        
        Summary: {summary}
        
        Example format:
        [
            {{"description": "Schedule follow-up meeting"}},
            {{"description": "Create design mockups"}}
        ]
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Try to extract JSON content
        text_response = response.text
        # Clean up the response to handle potential formatting issues
        text_response = text_response.strip()
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
        
        import json
        action_items = json.loads(text_response)
        
        # Add the completed flag to each action item
        for item in action_items:
            item["isCompleted"] = False
            
        return action_items
    except Exception as e:
        print(f"Error generating action items: {str(e)}")
        # Return default action items in case of failure
        return [
            {"description": "Review meeting notes", "isCompleted": False},
            {"description": "Schedule next steps", "isCompleted": False}
        ]

# Non-async function to run in a separate thread
def run_generate_summary(meeting_id: str):
    try:
        all_transcriptions = qdrant_manager.get_transcriptions(collection_name=meeting_id)
        all_text = ""
        for transcription in all_transcriptions:
            all_text += transcription['text']
        summary = Summarizer().summarize(all_text)['summary']
        
        # Generate action items based on the summary
        action_items = generate_action_items(summary)
        
        # Database operations for summary
        if db["summaries"].find_one({"meeting_id": meeting_id}):
            db["summaries"].update_one({"meeting_id": meeting_id}, {"$set": {"summary": summary}})
        else:
            db["summaries"].insert_one({"meeting_id": meeting_id, "summary": summary})
            
        # Database operations for action items
        # First delete any existing action items for this meeting
        db["actions"].delete_many({"meeting_id": meeting_id})
        
        # Then insert the new action items
        for item in action_items:
            item["meeting_id"] = meeting_id
            db["actions"].insert_one(item)
            
        print(f"Summary and action items for meeting {meeting_id} generated and saved successfully")
    except Exception as e:
        print(f"Error generating summary for meeting {meeting_id}: {str(e)}")

@app.get("/summaries/{meeting_id}/fetch_summary")
async def fetch_summary(meeting_id: str):
    try:
        summary = db["summaries"].find_one({"meeting_id": meeting_id})
        return {"summary": summary['summary']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching summary: {str(e)}")

# Add a new endpoint to toggle action item completion status
@app.put("/actions/{action_id}/toggle")
async def toggle_action_item(action_id: str):
    try:
        # Find the action item
        action = db["actions"].find_one({"_id": ObjectId(action_id)})
        
        if not action:
            raise HTTPException(status_code=404, detail="Action item not found")
        
        # Toggle the completion status
        new_status = not action.get("isCompleted", False)
        
        # Update the action item
        db["actions"].update_one(
            {"_id": ObjectId(action_id)},
            {"$set": {"isCompleted": new_status}}
        )
        
        return {"success": True, "message": "Action item status updated", "isCompleted": new_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating action item: {str(e)}")

# Add a new endpoint to get action items for a meeting
@app.get("/meetings/{meeting_id}/actions")
async def get_meeting_actions(meeting_id: str):
    try:
        # Get all action items for this meeting
        actions = list(db["actions"].find({"meeting_id": meeting_id}))
        
        # Convert ObjectIds to strings
        for action in actions:
            action["_id"] = str(action["_id"])
        
        return {"actions": actions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving action items: {str(e)}")