const exporters = require('./exporters');

function enrich_timestamp(dates) {
    let schema = [];
    (dates || []).forEach(item => {
        const prefix = item.name;

        let item_schema = exporters.timestamp.map(exporter => {
            let base = {"name" : `${prefix}${exporter.name}`, "type" : exporter.type};

            if ( exporter.name ) {
                base.system = true;
                base.subtype = exporter.subtype;
            }

            if (exporter.func) {
                base.func = exporter.func;
            }

            return base;
        });

        schema = schema.concat(item_schema);
    })

    return schema;
}

module.exports = {
    logical_schema : (schema) => {
        let dates = schema.filter(item => item.type === 'timestamp');
        //let full_dates = enrich_timestamp(dates);
        let full_dates = dates;
    
        let remaining = schema.filter(item => item.type !== 'timestamp');
    
        let result = [].concat(remaining).concat(full_dates);
        return result;
    }
}
