"""
Credentials API endpoints for secure credential storage
Supports: passwords, credit cards, secrets, 2FA codes
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from app.services.database import db
from app.services.encryption import encryption_service

router = APIRouter()


class PasswordCredential(BaseModel):
    name: str
    website_url: Optional[str] = None
    username: Optional[str] = None
    password: str
    notes: Optional[str] = None
    tags: List[str] = []


class CreditCardCredential(BaseModel):
    name: str
    card_number: str
    expiry: str
    cvv: str
    cardholder_name: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []


class SecretCredential(BaseModel):
    name: str
    secret_value: str
    notes: Optional[str] = None
    tags: List[str] = []


class TwoFactorCredential(BaseModel):
    name: str
    secret_key: str  # TOTP secret
    website_url: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []


class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None
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
    
    return "00000000-0000-0000-0000-000000000000"


def mask_credential(cred: dict) -> dict:
    """Mask sensitive fields in a credential"""
    masked = cred.copy()
    if masked.get('encrypted_value'):
        masked['encrypted_value'] = '••••••••'
    if masked.get('username'):
        masked['username'] = encryption_service.mask_value(masked['username'], 2)
    if masked.get('extra_data'):
        extra = masked['extra_data']
        if isinstance(extra, dict):
            if extra.get('card_number'):
                extra['card_number'] = '••••' + extra['card_number'][-4:] if len(extra.get('card_number', '')) >= 4 else '••••'
            if extra.get('cvv'):
                extra['cvv'] = '•••'
    return masked


@router.get("", response_model=dict)
async def list_credentials(request: Request, credential_type: Optional[str] = None):
    """List all credentials for the user (masked)"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        query = client.table('user_credentials').select('*').eq('user_id', user_id)
        
        if credential_type:
            query = query.eq('credential_type', credential_type)
        
        result = query.order('created_at', desc=True).execute()
        
        # Mask all sensitive data
        masked_data = [mask_credential(cred) for cred in (result.data or [])]
        
        return {"data": masked_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/password", response_model=dict)
async def create_password(cred: PasswordCredential, request: Request):
    """Create a password credential"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Encrypt sensitive data
        encrypted_password = encryption_service.encrypt(cred.password)
        encrypted_username = encryption_service.encrypt(cred.username) if cred.username else None
        
        data = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'credential_type': 'password',
            'name': cred.name,
            'website_url': cred.website_url,
            'username': encrypted_username,
            'encrypted_value': encrypted_password,
            'notes': cred.notes,
            'tags': cred.tags
        }
        
        result = client.table('user_credentials').insert(data).execute()
        
        return {"message": "Password saved", "data": mask_credential(result.data[0]) if result.data else None}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credit-card", response_model=dict)
async def create_credit_card(cred: CreditCardCredential, request: Request):
    """Create a credit card credential"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Encrypt card details
        encrypted_card = encryption_service.encrypt(cred.card_number)
        encrypted_cvv = encryption_service.encrypt(cred.cvv)
        
        extra_data = {
            'expiry': cred.expiry,
            'cardholder_name': cred.cardholder_name,
            'last_four': cred.card_number[-4:] if len(cred.card_number) >= 4 else ''
        }
        
        data = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'credential_type': 'credit_card',
            'name': cred.name,
            'encrypted_value': encrypted_card,
            'extra_data': {'cvv': encrypted_cvv, **extra_data},
            'notes': cred.notes,
            'tags': cred.tags
        }
        
        result = client.table('user_credentials').insert(data).execute()
        
        return {"message": "Credit card saved", "data": mask_credential(result.data[0]) if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/secret", response_model=dict)
async def create_secret(cred: SecretCredential, request: Request):
    """Create a secret/API key credential"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        encrypted_secret = encryption_service.encrypt(cred.secret_value)
        
        data = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'credential_type': 'secret',
            'name': cred.name,
            'encrypted_value': encrypted_secret,
            'notes': cred.notes,
            'tags': cred.tags
        }
        
        result = client.table('user_credentials').insert(data).execute()
        
        return {"message": "Secret saved", "data": mask_credential(result.data[0]) if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/2fa", response_model=dict)
async def create_2fa(cred: TwoFactorCredential, request: Request):
    """Create a 2FA/TOTP credential"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        encrypted_secret = encryption_service.encrypt(cred.secret_key)
        
        data = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'credential_type': '2fa',
            'name': cred.name,
            'website_url': cred.website_url,
            'encrypted_value': encrypted_secret,
            'notes': cred.notes,
            'tags': cred.tags
        }
        
        result = client.table('user_credentials').insert(data).execute()
        
        return {"message": "2FA saved", "data": mask_credential(result.data[0]) if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cred_id}", response_model=dict)
async def get_credential(cred_id: str, request: Request):
    """Get a single credential (masked)"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        result = client.table('user_credentials').select('*').eq('id', cred_id).eq('user_id', user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        return {"data": mask_credential(result.data)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{cred_id}/decrypt", response_model=dict)
async def decrypt_credential(cred_id: str, request: Request):
    """Get decrypted credential value (for agent use)"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        result = client.table('user_credentials').select('*').eq('id', cred_id).eq('user_id', user_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        cred = result.data
        
        # Decrypt the value
        decrypted_value = encryption_service.decrypt(cred['encrypted_value'])
        decrypted_username = encryption_service.decrypt(cred['username']) if cred.get('username') else None
        
        return {
            "data": {
                "id": cred['id'],
                "name": cred['name'],
                "type": cred['credential_type'],
                "username": decrypted_username,
                "value": decrypted_value,
                "website_url": cred.get('website_url'),
                "extra_data": cred.get('extra_data')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cred_id}", response_model=dict)
async def delete_credential(cred_id: str, request: Request):
    """Delete a credential"""
    try:
        user_id = get_user_id(request)
        client = db.get_client()
        
        # Verify ownership
        existing = client.table('user_credentials').select('id').eq('id', cred_id).eq('user_id', user_id).single().execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        client.table('user_credentials').delete().eq('id', cred_id).execute()
        
        return {"message": "Credential deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
