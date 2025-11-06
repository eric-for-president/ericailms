import mongoose from "mongoose";

const educatorRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: String,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    }
});

export const EducatorRequest = mongoose.model('EducatorRequest', educatorRequestSchema);