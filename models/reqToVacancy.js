module.exports = require('mongoose').model('request_vacancy',{
    from: String,
    vacancyId: String,
    status: {
        type: String,
        default: 'new'
    }
});