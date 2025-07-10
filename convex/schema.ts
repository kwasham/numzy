import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  receipts: defineTable({
    // Original file metadata
    userId: v.string(),
    fileName: v.string(),
    fileDisplayName: v.optional(v.string()),
    fileId: v.id("_storage"),
    uploadedAt: v.number(),
    size: v.number(),
    mimeType: v.string(),
    status: v.string(),

    // Processing status
    processing_successful: v.boolean(),
    error_message: v.optional(v.string()),

    // Receipt Details (extracted information)
    merchant: v.optional(v.string()),
    
    // Location information
    location_city: v.optional(v.string()),
    location_state: v.optional(v.string()),
    location_zipcode: v.optional(v.string()),
    
    time: v.optional(v.string()),
    transaction_id: v.optional(v.string()),
    subtotal: v.optional(v.string()),
    tax: v.optional(v.string()),
    total: v.optional(v.string()),
    handwritten_notes: v.array(v.string()),
    
    // Line items
    items: v.array(
      v.object({
        description: v.optional(v.string()),
        product_code: v.optional(v.string()),
        category: v.optional(v.string()),
        item_price: v.optional(v.string()),
        sale_price: v.optional(v.string()),
        quantity: v.optional(v.string()),
        total: v.optional(v.string()),
      })
    ),

    // Audit Decision
    not_travel_related: v.boolean(),
    amount_over_limit: v.boolean(),
    math_error: v.boolean(),
    handwritten_x: v.boolean(),
    audit_reasoning: v.string(),
    needs_audit: v.boolean(),
  })
});