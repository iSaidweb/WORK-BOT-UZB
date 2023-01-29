module.exports = require('mongoose').model('Requests',{
    from: String,
    orderId: String,
    about: String,
    status: {
        type: String,
        default: 'new'
    }
})