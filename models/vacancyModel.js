module.exports = require('mongoose').model('Vacancy',{
    from: String,
    title: String,
    about: String,
    amout: String,
    worktype: String,
    location: String,
    contacts: String,
    status: {
        type: String,
        default: 'new'
    }
});