module.exports = require('mongoose').model('request_work',{
    from: String,
    workId: String,
    about: String,
    status: {
        type: String,
        default: 'new'
    }
});