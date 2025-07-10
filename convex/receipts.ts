import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Function to generate a Convex upload url for the client
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        // Generate a URL that the client can use to upload a file
        return await ctx.storage.generateUploadUrl()
    },
})

// Store a receipt file and add it to the database
export const storeReceipt = mutation({
    args: {
        userId: v.string(),
        fileId: v.id("_storage"),
        fileName: v.string(),
        size: v.number(),
        mimeType: v.string(),
    },
    handler: async (ctx, args) => {
        // Save the receipt to the database with new schema
        const receiptId = await ctx.db.insert("receipts", {
            userId: args.userId,
            fileName: args.fileName,
            fileId: args.fileId,
            uploadedAt: Date.now(),
            size: args.size,
            mimeType: args.mimeType,
            status: 'pending',
            
            // Processing status
            processing_successful: false,
            error_message: undefined,
            
            // Receipt details - initialize as null/empty
            merchant: undefined,
            location_city: undefined,
            location_state: undefined,
            location_zipcode: undefined,
            time: undefined,
            transaction_id: undefined,
            subtotal: undefined,
            tax: undefined,
            total: undefined,
            handwritten_notes: [],
            items: [],
            
            // Audit decision - initialize with defaults
            not_travel_related: false,
            amount_over_limit: false,
            math_error: false,
            handwritten_x: false,
            audit_reasoning: "",
            needs_audit: false,
        })
        return receiptId
    }
})

export const getReceipts = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        // Only return receipts for the authenticated user
        return await ctx.db
            .query("receipts")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect()
    }
})

export const getReceiptById = query({
    args: {
        id: v.id("receipts")
    },
    handler: async (ctx, args) => {
        // Get the receipt
        const receipt = await ctx.db.get(args.id)

        // Verify user has access to this receipt
        if (receipt) {
            const identity = await ctx.auth.getUserIdentity()
            if (!identity) {
                throw new Error("Not Authorized")
            }

            const userId = identity.subject
            if (receipt.userId !== userId) {
                throw new Error("Not authorized to access this receipt")
            }
        }
        return receipt 
    }
})

export const getReceiptDownloadUrl = query({
    args: {
        fileId: v.id("_storage")
    },
    handler: async (ctx, args) => {
        // Get a temporary URL that can be used to download the file
        return await ctx.storage.getUrl(args.fileId)
    }
})

// Update the status of the receipt
export const updateReceiptStatus = mutation({
    args: {
        id: v.id("receipts"),
        status: v.string()
    },
    handler: async (ctx, args) => {
        // Verify user has access to this receipt
        const receipt = await ctx.db.get(args.id)
        if (!receipt) {
            throw new Error("Receipt not found")
        }

        const identity = await ctx.auth.getUserIdentity()
        if (!identity) {
            throw new Error("Not Authenticated")
        }

        const userId = identity.subject
        if (receipt.userId !== userId) {
            throw new Error("Not Authorized to update this receipt")
        }

        await ctx.db.patch(args.id, {
            status: args.status
        })
        return true
    }
})

// Delete a receipt and its file
export const deleteReceipt = mutation({
    args: {
        id: v.id("receipts")
    },
    handler: async (ctx, args) => {
        const receipt = await ctx.db.get(args.id)
        if (!receipt) {
            throw new Error("Receipt not found")
        }
        
        // // Verify user has access to this receipt
        // const identity = await ctx.auth.getUserIdentity()
        // if (!identity) {
        //     throw new Error("Not Authenticated")
        // }

        // const userId = identity.subject
        // if (receipt.userId !== userId) {
        //     throw new Error("Not authorized to delete this receipt")
        // }

        // Delete the file from storage
        await ctx.storage.delete(receipt.fileId)

        // Delete the receipt record
        await ctx.db.delete(args.id)

        return true
    }
})

// NEW: Update receipt with complete processing result
export const updateReceiptWithProcessingResult = mutation({
    args: {
        id: v.id("receipts"),
        processingResult: v.object({
            processing_successful: v.boolean(),
            error_message: v.optional(v.string()),
            receipt_details: v.object({
                merchant: v.optional(v.string()),
                location: v.object({
                    city: v.optional(v.string()),
                    state: v.optional(v.string()),
                    zipcode: v.optional(v.string()),
                }),
                time: v.optional(v.string()),
                transaction_id: v.optional(v.string()),
                subtotal: v.optional(v.string()),
                tax: v.optional(v.string()),
                total: v.optional(v.string()),
                handwritten_notes: v.array(v.string()),
                items: v.array(v.object({
                    description: v.optional(v.string()),
                    product_code: v.optional(v.string()),
                    category: v.optional(v.string()),
                    item_price: v.optional(v.string()),
                    sale_price: v.optional(v.string()),
                    quantity: v.optional(v.string()),
                    total: v.optional(v.string()),
                })),
            }),
            audit_decision: v.object({
                not_travel_related: v.boolean(),
                amount_over_limit: v.boolean(),
                math_error: v.boolean(),
                handwritten_x: v.boolean(),
                reasoning: v.string(),
                needs_audit: v.boolean(),
            }),
        }),
    },
    handler: async (ctx, args) => {
        // Verify the receipt exists
        const receipt = await ctx.db.get(args.id)
        if (!receipt) {
            throw new Error("Receipt not found")
        }

        // // Verify user has access
        // const identity = await ctx.auth.getUserIdentity()
        // if (!identity) {
        //     throw new Error("Not Authenticated")
        // }

        // const userId = identity.subject
        // if (receipt.userId !== userId) {
        //     throw new Error("Not authorized to update this receipt")
        // }

        const { processingResult } = args

        // Update the receipt with all the extracted and audit data
        await ctx.db.patch(args.id, {
            status: processingResult.processing_successful ? "processed" : "error",
            
            // Processing status
            processing_successful: processingResult.processing_successful,
            error_message: processingResult.error_message || undefined,
            
            // Receipt details
            merchant: processingResult.receipt_details.merchant,
            location_city: processingResult.receipt_details.location.city,
            location_state: processingResult.receipt_details.location.state,
            location_zipcode: processingResult.receipt_details.location.zipcode,
            time: processingResult.receipt_details.time,
            transaction_id: processingResult.receipt_details.transaction_id,
            subtotal: processingResult.receipt_details.subtotal,
            tax: processingResult.receipt_details.tax,
            total: processingResult.receipt_details.total,
            handwritten_notes: processingResult.receipt_details.handwritten_notes,
            items: processingResult.receipt_details.items,
            
            // Audit decision
            not_travel_related: processingResult.audit_decision.not_travel_related,
            amount_over_limit: processingResult.audit_decision.amount_over_limit,
            math_error: processingResult.audit_decision.math_error,
            handwritten_x: processingResult.audit_decision.handwritten_x,
            audit_reasoning: processingResult.audit_decision.reasoning,
            needs_audit: processingResult.audit_decision.needs_audit,
        })
        
        return { success: true }
    }
})



// NEW: Update receipt with error status
export const updateReceiptWithError = mutation({
    args: {
        id: v.id("receipts"),
        error_message: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify the receipt exists
        const receipt = await ctx.db.get(args.id)
        if (!receipt) {
            throw new Error("Receipt not found")
        }

        // // Verify user has access
        // const identity = await ctx.auth.getUserIdentity()
        // if (!identity) {
        //     throw new Error("Not Authenticated")
        // }

        // const userId = identity.subject
        // if (receipt.userId !== userId) {
        //     throw new Error("Not authorized to update this receipt")
        // }

        await ctx.db.patch(args.id, {
            status: "error",
            processing_successful: false,
            error_message: args.error_message,
        })

        return { success: true }
    }
})

// NEW: Query receipts that need audit
export const getReceiptsNeedingAudit = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("receipts")
            .filter((q) => 
                q.and(
                    q.eq(q.field("userId"), args.userId),
                    q.eq(q.field("needs_audit"), true),
                    q.eq(q.field("processing_successful"), true)
                )
            )
            .order("desc")
            .collect()
    }
})

// NEW: Get receipt statistics
export const getReceiptStats = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const allReceipts = await ctx.db
            .query("receipts")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .collect()

        const stats = {
            total: allReceipts.length,
            processed: allReceipts.filter(r => r.status === "processed").length,
            pending: allReceipts.filter(r => r.status === "pending").length,
            error: allReceipts.filter(r => r.status === "error").length,
            needsAudit: allReceipts.filter(r => r.needs_audit && r.processing_successful).length,
            totalAmount: allReceipts
                .filter(r => r.total && r.processing_successful)
                .reduce((sum, r) => sum + parseFloat(r.total || "0"), 0),
        }

        return stats
    }
})

// LEGACY: Keep the old mutation for backward compatibility (mark as deprecated)
/** @deprecated Use updateReceiptWithProcessingResult instead */
export const updateReceiptWithExtractedData = mutation({
    args: {
        id: v.id("receipts"),
        fileDisplayName: v.string(),
        merchantName: v.string(),
        merchantAddress: v.string(),
        merchantContact: v.string(),
        transactionDate: v.string(),
        transactionAmout: v.string(),
        currency: v.string(),
        receiptSummary: v.string(),
        items: v.array(
            v.object({
                name: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                totalPrice: v.number()
            })
        )
    },
    handler: async (ctx, args) => {
        // Verify the receipt exists
        const receipt = await ctx.db.get(args.id)
        if (!receipt) {
            throw new Error("Receipt not found")
        }

        // Legacy mapping to new schema
        await ctx.db.patch(args.id, {
            fileDisplayName: args.fileDisplayName,
            merchant: args.merchantName,
            // Split address into components (basic parsing)
            location_city: args.merchantAddress.split(',')[0]?.trim(),
            time: args.transactionDate,
            total: args.transactionAmout,
            status: "processed",
            processing_successful: true,
        })
        
        return {
            userId: receipt.userId
        }
    }
})