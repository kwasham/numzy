from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
import base64
import mimetypes
from pathlib import Path
from typing import Optional, List
import os
import io
from openai import AsyncOpenAI
from dotenv import load_dotenv
import PyPDF2
from pdf2image import convert_from_bytes
from PIL import Image

# Load environment variables
load_dotenv()

app = FastAPI(title="Receipt Inspection API", version="1.0.0")

# Add CORS middleware for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Pydantic models (copied from the notebook)
class Location(BaseModel):
    city: str | None = None
    state: str | None = None
    zipcode: str | None = None

class LineItem(BaseModel):
    description: str | None
    product_code: str | None
    category: str | None
    item_price: str | None
    sale_price: str | None
    quantity: str | None
    total: str | None

class ReceiptDetails(BaseModel):
    merchant: str | None = None
    location: Location = Field(default_factory=Location)
    time: str | None = None
    items: list[LineItem] = Field(default_factory=list)
    transaction_id: str | None = Field(
        default=None,
        description="Unique identifier for the transaction, if available"
    )
    subtotal: str | None = None
    tax: str | None = None
    total: str | None = None
    handwritten_notes: list[str] = Field(default_factory=list)

class AuditDecision(BaseModel):
    not_travel_related: bool = Field(
        description="True if the receipt is not travel-related"
    )
    amount_over_limit: bool = Field(description="True if the total amount exceeds $50")
    math_error: bool = Field(description="True if there are math errors in the receipt")
    handwritten_x: bool = Field(
        description="True if there is an 'X' in the handwritten notes"
    )
    reasoning: str = Field(description="Explanation for the audit decision")
    needs_audit: bool = Field(
        description="Final determination if receipt needs auditing"
    )

class ReceiptProcessingResult(BaseModel):
    receipt_details: ReceiptDetails
    audit_decision: AuditDecision
    processing_successful: bool
    error_message: str | None = None

# Prompts (from the notebook)
BASIC_PROMPT = """
Given an image of a retail receipt, extract all relevant information and format it as a structured response.

# Task Description

Carefully examine the receipt image and identify the following key information:

1. Merchant name and any relevant store identification
2. Location information (city, state, ZIP code)
3. Date and time of purchase
4. All purchased items with their:
   * Item description/name
   * Item code/SKU (if present)
   * Category (infer from context if not explicit)
   * Regular price per item (if available)
   * Sale price per item (if discounted)
   * Quantity purchased
   * Total price for the line item
5. Financial summary:
   * Subtotal before tax
   * Tax amount
   * Final total
6. Any handwritten notes or annotations on the receipt (list each separately)

## Important Guidelines

* If information is unclear or missing, return null for that field
* Format dates as ISO format (YYYY-MM-DDTHH:MM:SS)
* Format all monetary values as decimal numbers
* Distinguish between printed text and handwritten notes
* Be precise with amounts and totals
* For ambiguous items, use your best judgment based on context

Your response should be structured and complete, capturing all available information
from the receipt.
"""

AUDIT_PROMPT = """
Evaluate this receipt data to determine if it need to be audited based on the following
criteria:

1. NOT_TRAVEL_RELATED:
   - IMPORTANT: For this criterion, travel-related expenses include but are not limited
   to: gas, hotel, airfare, or car rental.
   - Travel-related expenses include anything that could be reasonably required for
   business-related travel activities. For instance, an employee using a personal
   vehicle might need to change their oil; if the receipt is for an oil change or the
   purchase of oil from an auto parts store, this would be acceptable and counts as a
   travel-related expense.
   - If the receipt IS for a travel-related expense, set this to FALSE.
   - If the receipt is NOT for a travel-related expense (like office supplies), set this
   to TRUE.
   - In other words, if the receipt shows FUEL/GAS, this would be FALSE because gas IS
   travel-related.

2. AMOUNT_OVER_LIMIT: The total amount exceeds $50

3. MATH_ERROR: The math for computing the total doesn't add up (line items don't sum to
   total)
   - Add up the price and quantity of each line item to get the subtotal
   - Add tax to the subtotal to get the total
   - If the total doesn't match the amount on the receipt, this is a math error
   - If the total is off by no more than $0.01, this is NOT a math error

4. HANDWRITTEN_X: There is an "X" in the handwritten notes

For each criterion, determine if it is violated (true) or not (false). Provide your
reasoning for each decision, and make a final determination on whether the receipt needs
auditing. A receipt needs auditing if ANY of the criteria are violated.

Note that violation of a criterion means that it is `true`. If any of the above four
values are `true`, then the receipt needs auditing (`needs_audit` should be `true`: it
functions as a boolean OR over all four criteria).

If the receipt contains non-travel expenses, then NOT_TRAVEL_RELATED should be `true`
and therefore NEEDS_AUDIT must also be set to `true`. IF THE RECEIPT LISTS ITEMS THAT
ARE NOT TRAVEL-RELATED, THEN IT MUST BE AUDITED.

Return a structured response with your evaluation.
"""

async def extract_receipt_details(image_path: Path, model: str = "gpt-4o-mini") -> ReceiptDetails:
    """Extract structured data from a receipt image."""
    
    # Read and encode the image
    image_data = image_path.read_bytes()
    b64_image = base64.b64encode(image_data).decode("utf-8")
    
    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(image_path))
    if mime_type is None:
        mime_type = "image/jpeg"  # Default fallback
    
    image_data_url = f"data:{mime_type};base64,{b64_image}"

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": BASIC_PROMPT},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "receipt_details",
                "schema": ReceiptDetails.model_json_schema()
            }
        }
    )

    import json
    return ReceiptDetails.model_validate(json.loads(response.choices[0].message.content))

async def extract_receipt_details_from_upload(file_data: bytes, model: str = "gpt-4o-mini") -> ReceiptDetails:
    """Extract structured data from uploaded receipt image or PDF."""
    
    # Check if the file is a PDF
    if is_pdf_file(file_data):
        return await extract_receipt_details_from_pdf(file_data, model)
    else:
        return await extract_receipt_details_from_image_bytes(file_data, model)

async def extract_receipt_details_from_image_bytes(file_data: bytes, model: str = "gpt-4o-mini") -> ReceiptDetails:
    """Extract structured data from image bytes."""
    
    # Encode the image
    b64_image = base64.b64encode(file_data).decode("utf-8")
    image_data_url = f"data:image/jpeg;base64,{b64_image}"

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": BASIC_PROMPT},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "receipt_details",
                "schema": ReceiptDetails.model_json_schema()
            }
        }
    )

    import json
    return ReceiptDetails.model_validate(json.loads(response.choices[0].message.content))

async def extract_receipt_details_from_pdf(pdf_data: bytes, model: str = "gpt-4o-mini") -> ReceiptDetails:
    """Extract structured data from PDF receipt."""
    
    # Try vision-based approach first (convert PDF to images)
    try:
        images = convert_pdf_to_images(pdf_data)
        if images:
            # Use the first page for receipt processing
            first_page = images[0]
            image_data_url = image_to_base64(first_page)
            
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": BASIC_PROMPT},
                            {"type": "image_url", "image_url": {"url": image_data_url}},
                        ],
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "receipt_details",
                        "schema": ReceiptDetails.model_json_schema()
                    }
                }
            )
            
            import json
            return ReceiptDetails.model_validate(json.loads(response.choices[0].message.content))
    except Exception as e:
        print(f"Vision-based PDF processing failed: {e}")
    
    # Fallback to text-based approach
    try:
        pdf_text = extract_text_from_pdf(pdf_data)
        if pdf_text.strip():
            
            text_prompt = f"""
{BASIC_PROMPT}

Extract receipt information from the following text content:

{pdf_text}
"""
            
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": text_prompt,
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "receipt_details",
                        "schema": ReceiptDetails.model_json_schema()
                    }
                }
            )
            
            import json
            return ReceiptDetails.model_validate(json.loads(response.choices[0].message.content))
    except Exception as e:
        print(f"Text-based PDF processing failed: {e}")
    
    # If both approaches fail, return empty receipt
    return ReceiptDetails(
        merchant=None,
        location=Location(),
        time=None,
        items=[],
        subtotal=None,
        tax=None,
        total=None,
        handwritten_notes=[]
    )

async def evaluate_receipt_for_audit(
    receipt_details: ReceiptDetails, model: str = "gpt-4o-mini"
) -> AuditDecision:
    """Determine if a receipt needs to be audited based on defined criteria."""
    # Convert receipt details to JSON for the prompt
    receipt_json = receipt_details.model_dump_json(indent=2)

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": AUDIT_PROMPT},
                    {"type": "text", "text": f"Receipt details:\n{receipt_json}"},
                ],
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "audit_decision",
                "schema": AuditDecision.model_json_schema()
            }
        }
    )

    import json
    return AuditDecision.model_validate(json.loads(response.choices[0].message.content))

@app.get("/")
async def root():
    return {"message": "Receipt Inspection API is running"}

@app.post("/process-receipt", response_model=ReceiptProcessingResult)

async def process_receipt(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}, type: {file.content_type}")
    """
    Process an uploaded receipt image and return extraction + audit results.
    """
    try:
        # Validate file type - allow both images and PDFs
        if not file.content_type or not (
            file.content_type.startswith("image/") or 
            file.content_type == "application/pdf"
        ):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image (JPEG, PNG, etc.) or PDF"
            )
        
        # Read file data
        file_data = await file.read()
        
        # Extract receipt details
        receipt_details = await extract_receipt_details_from_upload(file_data)
        
        # Make audit decision
        audit_decision = await evaluate_receipt_for_audit(receipt_details)
        
        return ReceiptProcessingResult(
            receipt_details=receipt_details,
            audit_decision=audit_decision,
            processing_successful=True,
            error_message=None
        )
        
    except Exception as e:
        return ReceiptProcessingResult(
            receipt_details=ReceiptDetails(
                merchant=None,
                location=Location(),
                time=None,
                items=[],
                transaction_id=None,  # ← Add this line
                subtotal=None,
                tax=None,
                total=None,
                handwritten_notes=[]
            ),
            audit_decision=AuditDecision(
                not_travel_related=False,
                amount_over_limit=False,
                math_error=False,
                handwritten_x=False,
                reasoning="Processing failed",
                needs_audit=True
            ),
            processing_successful=False,
            error_message=str(e)
        )

@app.post("/extract-receipt", response_model=ReceiptDetails)
async def extract_receipt(file: UploadFile = File(...)):
    """
    Extract receipt details from an uploaded image.
    """
    try:
        # Allow both images and PDFs
        if not file.content_type or not (
            file.content_type.startswith("image/") or 
            file.content_type == "application/pdf"
        ):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image (JPEG, PNG, etc.) or PDF"
            )   
        
        file_data = await file.read()
        receipt_details = await extract_receipt_details_from_upload(file_data)
        
        return receipt_details
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/audit-receipt", response_model=AuditDecision)
async def audit_receipt(receipt_details: ReceiptDetails):
    """
    Make an audit decision based on provided receipt details.
    """
    try:
        audit_decision = await evaluate_receipt_for_audit(receipt_details)
        return audit_decision
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

# PDF Processing Functions
def is_pdf_file(file_content: bytes) -> bool:
    """Check if the uploaded file is a PDF."""
    return file_content.startswith(b'%PDF')

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """Extract text content from PDF for text-based processing."""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def convert_pdf_to_images(pdf_content: bytes, dpi: int = 200) -> List[Image.Image]:
    """Convert PDF pages to images for vision model processing."""
    try:
        # Convert PDF to images
        images = convert_from_bytes(
            pdf_content, 
            dpi=dpi,
            first_page=1,
            last_page=3  # Limit to first 3 pages for receipts
        )
        return images
    except Exception as e:
        print(f"Error converting PDF to images: {e}")
        return []

def image_to_base64(image: Image.Image, format: str = "JPEG") -> str:
    """Convert PIL Image to base64 string."""
    buffer = io.BytesIO()
    # Convert RGBA to RGB if necessary
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    image.save(buffer, format=format)
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_str}"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
