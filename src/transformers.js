const Big = require('big.js');
// const df = require('date-and-time');

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
    },
    from : function(d) {
        return d.setUTCHours(0, 0, 0, 0);
    },
    to : function(d) {
        d.setUTCHours(0, 0, 0, 0);
        return d.setDate(d.getDate() + 1);
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

        const column_prefix = field.trgt_column;

        let d; 
        try {
            d = new Date(value);
        }
        catch(e) {};
        if ( !d) {
            return {};
        }

        let result = {};

        if ( field.transformer_type === "flat") {
            field.derivatives.forEach(derivative => {
                result[`${column_prefix}_${derivative.suffix}`] = transformers_smartdate[derivative.suffix](d);
            })
        }
        else if ( field.transformer_type === "object") {
            field.derivatives.forEach(derivative => {
                if ( !result[`${column_prefix}`] ) {
                    result[`${column_prefix}`] = {};
                }
                result[`${column_prefix}`][`${derivative.suffix}`] = transformers_smartdate[derivative.suffix](d);
            })
        }
        else {
            throw "transformer type is missing";
        }

        return result;
    },
    price_hardcoded_bgn: function(value) {
        return {value  :value, currency : "bgn"}
    }
};

module.exports = {
    transformers
}