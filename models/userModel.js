module.exports = require('mongoose').model("User",{
    id: String,
    name: String,
    balance: {
        type: Number,
        default: 0
    }, 
    phone: String,
    resume: String,
    positive: {
        type: Number,
        default: 0
    },
    negative: {
        type: Number,
        default: 0
    },
    uzcard: {
        type: String,
        default: "Kiritilmadi"
    },
    humo: {
        type: String,
        default: "Kiritilmadi"
    },
    works: {
        type: Array,
        default: []
    },
    step: {
        type: String,
        default: 'phone'
    },
    role: String,
    admin: {
        type: Boolean,
        default: false,
    },
    alert: {
        type: Boolean,
        default: true
    },
    block: {
        type: Boolean,
        default: false
    },
    etc: {
        type: Object,
        default: {}
    }
});