module.exports = require('mongoose').model('Order',{
    from: String,
    title: String,
    about: String,
    amout: Number,
    category: String,
    status: {
        type: String,
        default: 'new'
    }
})