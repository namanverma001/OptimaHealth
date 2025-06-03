const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    dosage: {
        type: String,
        required: true
    },
    times: [{
        type: String,
        required: true
    }],
    startDate: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    reminderEnabled: {
        type: Boolean,
        default: true
    },
    currentSupply: {
        type: Number,
        required: true
    },
    totalSupply: {
        type: Number,
        required: true
    },
    refillAt: {
        type: Number,
        required: true
    },
    refillReminder: {
        type: Boolean,
        default: false
    },
    lastRefillDate: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Medication', medicationSchema);
