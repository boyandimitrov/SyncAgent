const Big = require('big.js');
const df = require('date-and-time');

const transformers_smartdate = {
    master : function(d) {
        return d.getTime() / 1000;
    },
    quarter: function(d) {
        return Math.floor(d.getMonth() / 3 + 1)
    },
    half : function(d) {
        return Math.floor(d.getMonth() / 6 + 1)
    },
    year : function(d) {
        return d.getFullYear();
    },
    month : function(d) {
        return Math.floor(d.getMonth() + 1)
    },
    date : function(d) {
        return d.getDate();
    },
    day : function(d) {
        return d.getDay() + 1;
    },
    week : function(d) {
        let dUtc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        let dayNum = dUtc.getUTCDay() || 7;
        dUtc.setUTCDate(dUtc.getUTCDate() + 4 - dayNum);
        let yearStart = new Date(Date.UTC(dUtc.getUTCFullYear(),0,1));
        return Math.ceil((((dUtc - yearStart) / 86400000) + 1)/7)
    }
}

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
    },
    miliseconds_to_timestamp: function(value) {
        const date = new Date(value);
        return date.toISOString();
    },
    timestamp_to_smartdate: function(value, field) {

        const column_prefix = field.bq_column;

        let d; 
        try {
            d = new Date(value);
        }
        catch(e) {};
        if ( !d) {
            return {};
        }

        let result = {};
        field.derivatives.forEach(derivative => {
            result[`${column_prefix}_${derivative.suffix}`] = transformers_smartdate[derivative.suffix](d);
        })

        return result;
    }
};

module.exports = {
    transformers
}