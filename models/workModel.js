module.exports = require('mongoose').model('Work',{
    from: String,
    title: String,
    about: String,
    amout: Number,
    category: String,
    example: String,
    sell: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: 'new'
    }
});