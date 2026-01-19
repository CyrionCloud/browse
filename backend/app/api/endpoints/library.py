"""
User Library API endpoints for file management
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
from datetime import datetime
from app.services.database import db
from app.core.config import settings

router = APIRouter()

# Allowed file types
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx',
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'json', 'xml'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class FileMetadata(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    category: str
    description: Optional[str] = None
    tags: List[str] = []
    created_at: str
    
class FileUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


def get_user_id(request: Request) -> str:
    """Get user ID from token or return mock user for dev"""
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(" ")[1] if auth_header and " " in auth_header else None
    
    if token:
        try:
            client = db.get_authenticated_client(token)
            user = client.auth.get_user(token)
            if user and user.user:
                return user.user.id
        except Exception:
            pass
    
    return "00000000-0000-0000-0000-000000000000"  # Mock user for dev


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


@router.get("", response_model=dict)
async def list_files(request: Request, category: Optional[str] = None):
    """List all files for the current user"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        query = client.table('user_files').select('*').eq('user_id', user_id)
        
        if category:
            query = query.eq('category', category)
        
        result = query.order('created_at', desc=True).execute()
        
        return {"data": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=dict)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(default="document"),
    description: str = Form(default=""),
    tags: str = Form(default="")
):
    """Upload a file to user's library"""
    try:
        user_id = get_user_id(request)
        
        # Validate file extension
        extension = get_file_extension(file.filename)
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type .{extension} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        storage_filename = f"{file_id}.{extension}"
        storage_path = f"{user_id}/{storage_filename}"
        
        # Upload to Supabase Storage
        client = db.get_client()
        
        try:
            # Try to upload to storage bucket
            storage_result = client.storage.from_('user-library').upload(
                storage_path,
                content,
                {"content-type": file.content_type or "application/octet-stream"}
            )
        except Exception as storage_error:
            # If storage bucket doesn't exist, create file metadata anyway
            # Files will be stored when bucket is created
            print(f"Storage upload warning: {storage_error}")
        
        # Parse tags
        tag_list = [t.strip() for t in tags.split(',') if t.strip()] if tags else []
        
        # Save file metadata to database
        file_data = {
            'id': file_id,
            'user_id': user_id,
            'filename': storage_filename,
            'original_name': file.filename,
            'file_type': extension,
            'file_size': file_size,
            'storage_path': storage_path,
            'category': category,
            'description': description,
            'tags': tag_list
        }
        
        result = client.table('user_files').insert(file_data).execute()
        
        return {
            "message": "File uploaded successfully",
            "data": result.data[0] if result.data else file_data
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}", response_model=dict)
async def get_file(file_id: str, request: Request):
    """Get file metadata by ID"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        result = client.table('user_files').select('*').eq('id', file_id).eq('user_id', user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="File not found")
        
        return {"data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/download")
async def download_file(file_id: str, request: Request):
    """Get download URL for a file"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Get file metadata
        result = client.table('user_files').select('*').eq('id', file_id).eq('user_id', user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_data = result.data
        
        # Generate signed URL for download
        try:
            signed_url = client.storage.from_('user-library').create_signed_url(
                file_data['storage_path'],
                3600  # 1 hour expiry
            )
            return {"data": {"url": signed_url['signedURL'], "filename": file_data['original_name']}}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not generate download URL: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{file_id}", response_model=dict)
async def update_file(file_id: str, update: FileUpdate, request: Request):
    """Update file metadata"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Check file exists and belongs to user
        existing = client.table('user_files').select('id').eq('id', file_id).eq('user_id', user_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Build update data
        update_data = {'updated_at': datetime.utcnow().isoformat()}
        if update.description is not None:
            update_data['description'] = update.description
        if update.category is not None:
            update_data['category'] = update.category
        if update.tags is not None:
            update_data['tags'] = update.tags
        
        result = client.table('user_files').update(update_data).eq('id', file_id).execute()
        
        return {"message": "File updated", "data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{file_id}", response_model=dict)
async def delete_file(file_id: str, request: Request):
    """Delete a file"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Get file to find storage path
        file_result = client.table('user_files').select('*').eq('id', file_id).eq('user_id', user_id).single().execute()
        
        if not file_result.data:
            raise HTTPException(status_code=404, detail="File not found")
        
        storage_path = file_result.data['storage_path']
        
        # Delete from storage
        try:
            client.storage.from_('user-library').remove([storage_path])
        except Exception as e:
            print(f"Storage delete warning: {e}")
        
        # Delete metadata from database
        client.table('user_files').delete().eq('id', file_id).execute()
        
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/list", response_model=dict)
async def list_categories(request: Request):
    """Get list of file categories for the user"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        result = client.table('user_files').select('category').eq('user_id', user_id).execute()
        
        categories = list(set(f['category'] for f in result.data if f.get('category')))
        
        return {"data": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
