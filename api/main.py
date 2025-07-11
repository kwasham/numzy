from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import io
import base64
from PIL import Image
from typing import Dict, Any, Optional
import json

app = FastAPI(title="Numzy Receipt Processing API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Receipt processing API is running"}

@app.post("/api/process-receipt")
async def process_receipt(file: UploadFile = File(...)):
    """
    Process uploaded receipt file and extract data
    """
    try:
        # Validate file type
        if not file.content_type:
            raise HTTPException(status_code=400, detail="File type not specified")
        
        allowed_types = [
            "application/pdf",
            "image/jpeg", 
            "image/jpg",
            "image/png",
            "image/heic",
            "image/webp"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Basic file validation
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
        # Process image files
        processed_data = None
        if file.content_type.startswith("image/"):
            processed_data = await process_image_receipt(file_content, file.filename)
        elif file.content_type == "application/pdf":
            processed_data = await process_pdf_receipt(file_content, file.filename)
        
        return {
            "success": True,
            "message": "Receipt processed successfully",
            "data": processed_data,
            "file_info": {
                "filename": file.filename,
                "size": file_size,
                "type": file.content_type
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

async def process_image_receipt(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Process image receipt and extract basic information"""
    try:
        # Open and validate image
        image = Image.open(io.BytesIO(file_content))
        
        # Get image info
        width, height = image.size
        format_name = image.format
        
        # Mock OCR results - In a real implementation, you'd use OCR here
        # This returns sample data that matches the expected structure
        extracted_data = {
            "merchant_name": "Sample Store",
            "date": "2025-01-10",
            "total_amount": 25.99,
            "currency": "USD",
            "items": [
                {
                    "name": "Sample Item 1",
                    "price": 12.99,
                    "quantity": 1
                },
                {
                    "name": "Sample Item 2", 
                    "price": 13.00,
                    "quantity": 1
                }
            ],
            "tax_amount": 2.08,
            "confidence_score": 0.85
        }
        
        return {
            "type": "image",
            "format": format_name,
            "dimensions": {"width": width, "height": height},
            "extracted_data": extracted_data,
            "processing_method": "basic_image_analysis"
        }
        
    except Exception as e:
        raise Exception(f"Image processing failed: {str(e)}")

async def process_pdf_receipt(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Process PDF receipt and extract basic information"""
    try:
        # Basic PDF info
        file_size = len(file_content)
        
        # Mock PDF processing - In a real implementation, you'd use PDF processing libraries
        extracted_data = {
            "merchant_name": "PDF Receipt Store",
            "date": "2025-01-10", 
            "total_amount": 45.99,
            "currency": "USD",
            "items": [
                {
                    "name": "PDF Item 1",
                    "price": 20.99,
                    "quantity": 1
                },
                {
                    "name": "PDF Item 2",
                    "price": 25.00,
                    "quantity": 1
                }
            ],
            "tax_amount": 3.68,
            "confidence_score": 0.90
        }
        
        return {
            "type": "pdf",
            "size_bytes": file_size,
            "extracted_data": extracted_data,
            "processing_method": "basic_pdf_analysis"
        }
        
    except Exception as e:
        raise Exception(f"PDF processing failed: {str(e)}")

@app.post("/api/validate-receipt")
async def validate_receipt(data: Dict[str, Any]):
    """
    Validate receipt data structure and content
    """
    try:
        required_fields = ["merchant_name", "total_amount", "date"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return {
                "valid": False,
                "errors": [f"Missing required field: {field}" for field in missing_fields]
            }
        
        # Basic validation rules
        errors = []
        
        if not isinstance(data.get("total_amount"), (int, float)) or data["total_amount"] <= 0:
            errors.append("Total amount must be a positive number")
        
        if not data.get("merchant_name", "").strip():
            errors.append("Merchant name cannot be empty")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "validated_data": data if len(errors) == 0 else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@app.get("/api/receipt/{receipt_id}")
async def get_receipt(receipt_id: str):
    """
    Get receipt by ID (mock implementation)
    """
    try:
        # Mock receipt data - In a real implementation, you'd fetch from database
        mock_receipt = {
            "id": receipt_id,
            "merchant_name": "Mock Store",
            "date": "2025-01-10",
            "total_amount": 35.99,
            "currency": "USD",
            "status": "processed",
            "created_at": "2025-01-10T12:00:00Z"
        }
        
        return {
            "success": True,
            "data": mock_receipt
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching receipt: {str(e)}")

# Root endpoint
@app.get("/api")
async def root():
    return {
        "message": "Numzy Receipt Processing API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "process": "/api/process-receipt",
            "validate": "/api/validate-receipt",
            "get_receipt": "/api/receipt/{id}"
        }
    }

# For Vercel deployment
def handler(request):
    """Vercel serverless function handler"""
    return app(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
