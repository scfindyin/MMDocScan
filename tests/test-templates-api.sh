#!/bin/bash
# Template CRUD API Test Script
# Story 1.3: Template Data Model and Storage
# Tests all CRUD operations for templates API

BASE_URL="http://localhost:3002/api/templates"

echo "===================================="
echo "Template CRUD API Test Suite"
echo "Story 1.3: Template Data Model and Storage"
echo "===================================="
echo ""

# Test 1: CREATE Template
echo "Test 1: CREATE - Create a new invoice template with fields and prompts"
echo "POST $BASE_URL"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard Invoice Template",
    "template_type": "invoice",
    "fields": [
      {
        "field_name": "Invoice Number",
        "field_type": "text",
        "is_header": true,
        "display_order": 0
      },
      {
        "field_name": "Invoice Date",
        "field_type": "date",
        "is_header": true,
        "display_order": 1
      },
      {
        "field_name": "Total Amount",
        "field_type": "currency",
        "is_header": true,
        "display_order": 2
      },
      {
        "field_name": "Line Item Description",
        "field_type": "text",
        "is_header": false,
        "display_order": 3
      },
      {
        "field_name": "Quantity",
        "field_type": "number",
        "is_header": false,
        "display_order": 4
      },
      {
        "field_name": "Unit Price",
        "field_type": "currency",
        "is_header": false,
        "display_order": 5
      }
    ],
    "prompts": [
      {
        "prompt_text": "Extract all invoice header fields including invoice number, date, and total amount",
        "prompt_type": "extraction"
      },
      {
        "prompt_text": "Validate that the sum of line items equals the total amount",
        "prompt_type": "validation"
      }
    ]
  }')

echo "$CREATE_RESPONSE" | python -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"
TEMPLATE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo ""
echo "Created Template ID: $TEMPLATE_ID"
echo ""
sleep 1

# Test 2: READ All Templates
echo "===================================="
echo "Test 2: READ - Get all templates"
echo "GET $BASE_URL"
curl -s "$BASE_URL" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL"
echo ""
sleep 1

# Test 3: READ Single Template with Fields and Prompts
echo "===================================="
echo "Test 3: READ - Get template by ID with fields and prompts"
echo "GET $BASE_URL/$TEMPLATE_ID"
curl -s "$BASE_URL/$TEMPLATE_ID" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/$TEMPLATE_ID"
echo ""
sleep 1

# Test 4: UPDATE Template
echo "===================================="
echo "Test 4: UPDATE - Update template name and add a new field"
echo "PUT $BASE_URL/$TEMPLATE_ID"
curl -s -X PUT "$BASE_URL/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Updated Invoice Template - Version 2\"
  }" | python -m json.tool 2>/dev/null || curl -s -X PUT "$BASE_URL/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Invoice Template - Version 2"
  }'
echo ""
sleep 1

# Test 5: Verify Update
echo "===================================="
echo "Test 5: Verify update was successful"
echo "GET $BASE_URL/$TEMPLATE_ID"
curl -s "$BASE_URL/$TEMPLATE_ID" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/$TEMPLATE_ID"
echo ""
sleep 1

# Test 6: DELETE Template
echo "===================================="
echo "Test 6: DELETE - Delete template and cascade delete fields/prompts"
echo "DELETE $BASE_URL/$TEMPLATE_ID"
curl -s -X DELETE "$BASE_URL/$TEMPLATE_ID" | python -m json.tool 2>/dev/null || curl -s -X DELETE "$BASE_URL/$TEMPLATE_ID"
echo ""
sleep 1

# Test 7: Verify Deletion
echo "===================================="
echo "Test 7: Verify template was deleted (should return 404)"
echo "GET $BASE_URL/$TEMPLATE_ID"
curl -s "$BASE_URL/$TEMPLATE_ID" | python -m json.tool 2>/dev/null || curl -s "$BASE_URL/$TEMPLATE_ID"
echo ""

# Test 8: Test Invalid Template Type
echo "===================================="
echo "Test 8: Validation - Try to create template with invalid type (should fail)"
echo "POST $BASE_URL"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Template",
    "template_type": "invalid_type"
  }' | python -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Template",
    "template_type": "invalid_type"
  }'
echo ""

echo "===================================="
echo "✅ All CRUD tests completed!"
echo "===================================="
