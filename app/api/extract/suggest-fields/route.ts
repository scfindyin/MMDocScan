import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

interface FieldSuggestionRequest {
  base64Document: string
  documentType: string
  guidancePrompt?: string
}

interface SuggestedField {
  field_name: string
  field_type: "text" | "number" | "date" | "currency"
  category: "header" | "detail"
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: FieldSuggestionRequest = await request.json()
    const { base64Document, documentType, guidancePrompt } = body

    // Validate required fields
    if (!base64Document || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields: base64Document and documentType" },
        { status: 400 }
      )
    }

    // Check API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured in environment variables")
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 500 }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Build analysis prompt with optional user guidance
    let analysisPrompt =
      "Analyze this document and suggest extractable fields with data types. For each field, specify: field name, data type (text/number/date/currency), and whether it's a header field (document-level) or detail field (repeating line items)."

    if (guidancePrompt && guidancePrompt.trim()) {
      analysisPrompt = `${guidancePrompt.trim()}\n\nBased on this guidance, ${analysisPrompt}`
    }

    // Build content array based on document type
    // Note: Currently Anthropic SDK only supports PDF for document type
    // For other formats, we'll use text content or provide guidance to user
    const contentArray: any[] = [];

    if (documentType === "application/pdf") {
      // PDF files use document type
      contentArray.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf" as const,
          data: base64Document,
        },
      });
    } else if (documentType === "text/plain") {
      // Text files: decode base64 and send as text
      try {
        const textContent = Buffer.from(base64Document, "base64").toString("utf-8");
        contentArray.push({
          type: "text",
          text: `Here is the document content:\n\n${textContent}\n\n`,
        });
      } catch (e) {
        return NextResponse.json(
          { error: "Failed to decode text file" },
          { status: 400 }
        );
      }
    } else {
      // Word and other formats not directly supported by SDK yet
      return NextResponse.json(
        {
          error:
            "Currently only PDF and text files are supported for AI analysis. For Word documents, please save as PDF first.",
        },
        { status: 400 }
      );
    }

    // Add analysis prompt
    contentArray.push({
      type: "text",
      text: analysisPrompt,
    });

    // Call Claude API with document and prompt
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: contentArray,
        },
      ],
      tools: [
        {
          name: "suggest_fields",
          description: "Suggest extractable fields from document",
          input_schema: {
            type: "object",
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field_name: { type: "string" },
                    field_type: {
                      type: "string",
                      enum: ["text", "number", "date", "currency"],
                    },
                    category: {
                      type: "string",
                      enum: ["header", "detail"],
                    },
                  },
                  required: ["field_name", "field_type", "category"],
                },
              },
            },
            required: ["fields"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "suggest_fields" },
    })

    // Parse tool use response
    const toolUseBlock = message.content.find((c) => c.type === "tool_use")

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      console.error("Claude response missing tool_use block:", message.content)
      return NextResponse.json(
        { error: "Unable to analyze document. Please try again or define fields manually." },
        { status: 500 }
      )
    }

    const suggestedFields: SuggestedField[] = (toolUseBlock.input as any).fields || []

    // Return suggested fields
    return NextResponse.json({ suggestedFields })
  } catch (error) {
    console.error("Error in suggest-fields API:", error)

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API Error:", {
        status: error.status,
        message: error.message,
        name: error.name,
      })

      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Please contact support." },
          { status: 500 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again in a moment." },
          { status: 429 }
        )
      }

      // Return more specific error message for debugging
      return NextResponse.json(
        { error: `API Error: ${error.message}` },
        { status: 500 }
      )
    }

    // Log non-Anthropic errors
    if (error instanceof Error) {
      console.error("General Error:", {
        message: error.message,
        stack: error.stack,
      })
    }

    return NextResponse.json(
      { error: "Unable to analyze document. Please try again or define fields manually." },
      { status: 500 }
    )
  }
}
