"""
Receipt processing utilities and helpers
"""
from typing import Dict, List, Any, Optional, Union
import re
import json
from datetime import datetime
import base64

class ReceiptProcessor:
    """Main receipt processing class"""
    
    def __init__(self):
        self.supported_formats = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    
    async def process_image(self, image_data: bytes, content_type: str) -> Dict[str, Any]:
        """Process receipt image and extract data"""
        
        # This is where you'd integrate your existing Python server logic
        # For now, we'll return structured mock data
        
        extracted_data = {
            "raw_text": "SAMPLE STORE\n123 Main St\nReceipt #12345\nCoffee $4.50\nTax $0.45\nTotal $4.95",
            "structured_data": {
                "merchant": "Sample Store",
                "address": "123 Main St",
                "receipt_number": "12345",
                "items": [
                    {
                        "description": "Coffee",
                        "price": 4.50,
                        "quantity": 1,
                        "total": 4.50
                    }
                ],
                "subtotal": 4.50,
                "tax": 0.45,
                "total": 4.95,
                "date": datetime.now().isoformat()
            },
            "confidence_scores": {
                "overall": 0.92,
                "merchant": 0.95,
                "total": 0.98,
                "items": 0.89
            }
        }
        
        return extracted_data
    
    def validate_receipt_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted receipt data"""
        
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "audit_flags": {
                "needs_manual_review": False,
                "math_error": False,
                "low_confidence": False,
                "unusual_amount": False
            }
        }
        
        # Math validation
        try:
            items_total = sum(item.get("total", 0) for item in data.get("items", []))
            declared_subtotal = data.get("subtotal", 0)
            declared_tax = data.get("tax", 0)
            declared_total = data.get("total", 0)
            
            # Check if math adds up
            if abs(items_total - declared_subtotal) > 0.02:
                validation_result["errors"].append("Items total doesn't match subtotal")
                validation_result["audit_flags"]["math_error"] = True
            
            if abs((declared_subtotal + declared_tax) - declared_total) > 0.02:
                validation_result["errors"].append("Subtotal + tax doesn't equal total")
                validation_result["audit_flags"]["math_error"] = True
                
        except (TypeError, ValueError) as e:
            validation_result["errors"].append(f"Invalid numeric data: {str(e)}")
        
        # Confidence check
        confidence = data.get("confidence_scores", {}).get("overall", 0)
        if confidence < 0.8:
            validation_result["warnings"].append("Low confidence in OCR results")
            validation_result["audit_flags"]["low_confidence"] = True
        
        # Amount check
        total_amount = data.get("total", 0)
        if total_amount > 1000:  # Configurable threshold
            validation_result["warnings"].append("High amount - may need review")
            validation_result["audit_flags"]["unusual_amount"] = True
        
        # Set overall validity
        validation_result["is_valid"] = len(validation_result["errors"]) == 0
        
        # Flag for manual review if there are any issues
        if validation_result["errors"] or any(validation_result["audit_flags"].values()):
            validation_result["audit_flags"]["needs_manual_review"] = True
        
        return validation_result

class OCREngine:
    """OCR processing engine"""
    
    def __init__(self):
        self.engine_type = "tesseract"  # Could be "google_vision", "aws_textract", etc.
    
    async def extract_text(self, image_data: bytes) -> str:
        """Extract text from image using OCR"""
        
        # This is where you'd integrate with:
        # - Tesseract OCR
        # - Google Cloud Vision API
        # - AWS Textract
        # - Azure Computer Vision
        
        # Mock implementation
        mock_text = """
        GROCERY STORE
        123 MAIN STREET
        ANYTOWN, CA 90210
        
        RECEIPT #: 1234567890
        DATE: 01/10/2025
        TIME: 14:30:22
        
        ITEMS:
        Bananas          $3.99
        Milk 1 Gal       $4.49
        Bread            $2.99
        
        SUBTOTAL:        $11.47
        TAX:             $1.03
        TOTAL:           $12.50
        
        PAYMENT: VISA ****1234
        AUTH: 123456
        
        THANK YOU!
        """
        
        return mock_text.strip()

class TextParser:
    """Parse extracted text into structured data"""
    
    def __init__(self):
        self.currency_pattern = r'\$?\d+\.\d{2}'
        self.date_patterns = [
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{4}-\d{2}-\d{2}',
            r'\d{1,2}-\d{1,2}-\d{4}'
        ]
    
    def parse_receipt_text(self, text: str) -> Dict[str, Any]:
        """Parse raw OCR text into structured receipt data"""
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        parsed_data = {
            "merchant": self._extract_merchant(lines),
            "date": self._extract_date(text),
            "time": self._extract_time(text),
            "receipt_number": self._extract_receipt_number(text),
            "items": self._extract_items(lines),
            "subtotal": self._extract_amount(text, "subtotal"),
            "tax": self._extract_amount(text, "tax"),
            "total": self._extract_amount(text, "total"),
            "payment_method": self._extract_payment_method(text)
        }
        
        return parsed_data
    
    def _extract_merchant(self, lines: List[str]) -> str:
        """Extract merchant name (usually first non-empty line)"""
        for line in lines:
            if line and not self._is_address_line(line) and not self._is_number_line(line):
                return line
        return "Unknown Merchant"
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract transaction date"""
        for pattern in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group()
        return None
    
    def _extract_time(self, text: str) -> Optional[str]:
        """Extract transaction time"""
        time_pattern = r'\d{1,2}:\d{2}(?::\d{2})?'
        match = re.search(time_pattern, text)
        return match.group() if match else None
    
    def _extract_receipt_number(self, text: str) -> Optional[str]:
        """Extract receipt/transaction number"""
        patterns = [
            r'RECEIPT #:?\s*(\w+)',
            r'TRANS #:?\s*(\w+)',
            r'#(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_items(self, lines: List[str]) -> List[Dict[str, Any]]:
        """Extract line items from receipt"""
        items = []
        
        # Look for lines that contain both text and a price
        for line in lines:
            if self._looks_like_item_line(line):
                item = self._parse_item_line(line)
                if item:
                    items.append(item)
        
        return items
    
    def _extract_amount(self, text: str, amount_type: str) -> Optional[float]:
        """Extract specific amount (subtotal, tax, total)"""
        patterns = {
            "subtotal": r'SUBTOTAL:?\s*\$?(\d+\.\d{2})',
            "tax": r'TAX:?\s*\$?(\d+\.\d{2})',
            "total": r'TOTAL:?\s*\$?(\d+\.\d{2})'
        }
        
        pattern = patterns.get(amount_type.lower())
        if pattern:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return float(match.group(1))
        return None
    
    def _extract_payment_method(self, text: str) -> Optional[str]:
        """Extract payment method"""
        payment_patterns = [
            r'VISA\s*\*+\d{4}',
            r'MASTERCARD\s*\*+\d{4}',
            r'AMEX\s*\*+\d{4}',
            r'CASH',
            r'DEBIT\s*\*+\d{4}'
        ]
        
        for pattern in payment_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group()
        return None
    
    def _is_address_line(self, line: str) -> bool:
        """Check if line looks like an address"""
        address_indicators = ['street', 'st', 'ave', 'avenue', 'blvd', 'road', 'rd']
        return any(indicator in line.lower() for indicator in address_indicators)
    
    def _is_number_line(self, line: str) -> bool:
        """Check if line is mostly numbers"""
        return bool(re.match(r'^\d+[\d\s-]*$', line))
    
    def _looks_like_item_line(self, line: str) -> bool:
        """Check if line looks like an item with price"""
        # Simple heuristic: has text and ends with a price
        return bool(re.search(r'.+\$\d+\.\d{2}$', line))
    
    def _parse_item_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse individual item line"""
        # Extract price (last currency amount on line)
        price_match = re.search(r'\$(\d+\.\d{2})$', line)
        if not price_match:
            return None
        
        price = float(price_match.group(1))
        description = line[:price_match.start()].strip()
        
        # Try to extract quantity
        quantity = 1
        qty_match = re.search(r'(\d+)\s*x\s*', description, re.IGNORECASE)
        if qty_match:
            quantity = int(qty_match.group(1))
            description = re.sub(r'\d+\s*x\s*', '', description, flags=re.IGNORECASE).strip()
        
        return {
            "description": description,
            "quantity": quantity,
            "item_price": price / quantity,
            "total": price
        }
