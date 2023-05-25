const Big = require('big.js');

const transformers = {
    string_to_guid: function(value) {
        // Implement your string to GUID transformation here
        return value;
    },
    string_to_date: function(value) {
        let date = new Date(value);

        if (isNaN(date.getTime())) {
            console.log('Invalid date string');
            return null;
        }
    
        return date;
    },
    int_to_string: function(value) {
        // Implement your integer to string transformation here
        return value.toString();
    },
    string_to_timestamp: function(value) {
        // Implement your string to timestamp transformation here
        return value;
    },
    float_to_numeric: function(value) {
        return new Big(value).toFixed(2);
    }
};

module.exports = {
    transformers
}