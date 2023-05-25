const {transformers} = require('./transformers');

function strategyFlatten(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        let value = parseObject(obj[field.es_column], field.flatten, id);
        if (value !== null && typeof value !== 'undefined') {
            return value;
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }

    return null;
}

function strategyForeignKeySimple(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        let value = parseObject(obj[field.es_column], field.fk, id);
        if (value !== null && typeof value !== 'undefined') {
            return value;
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }
}

function strategyForeignKeyType(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        const fk_obj = obj[field.es_column];
        const fk_schema = field.fk[0];

        const type = fk_obj[fk_schema.es_type_column];
        if (!(fk_schema.es_types || []).includes(type)) {
            console.error("unsupported type");
            return null;
        }

        let value = fk_obj[fk_schema.es_column];
        if (value !== null && typeof value !== 'undefined') {
            return {[fk_schema.bq_column + type] : value};
        }
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }
}

function strategyForeignKeyBridge(obj, field, id) {
    if ( obj && obj[field.es_column]) {
        const fk_objs = obj[field.es_column] || [];
        const fk_schema = field.fk[0];

        let bridge_rows = [] ;
        fk_objs.forEach(fk_obj => {
            bridge_rows.push({
                [fk_schema.bq_primary] : id, 
                [fk_schema.bq_column] : fk_obj[fk_schema.es_column] 
            })
        })
        let bridge = {[fk_schema.bq_bridge] : bridge_rows}
        return [{}, bridge];
    }
    else {
        console.log(`${id} has missing value for ${field.es_type}`);
    }
}

function strategyNormal(obj, field, id) {
    try {
        let value = obj[field.es_column];
        const transformer = field.transformer;
        if (transformer && transformers[transformer]) {
            value = transformers[transformer](value);
        }
        return {[field.bq_column] : value};
    }
    catch (e) {
        console.error(e);
    }

    return null
}

function mergeBridgeValues(bridgeValues) {
    let result = {};

    for (let bridgeValue of bridgeValues) {
        for (let key in bridgeValue) {
            if (result[key]) {
                result[key] = [...result[key], ...bridgeValue[key]];
            } else {
                result[key] = bridgeValue[key];
            }
        }
    }

    return result;
}

function parseObject(obj, mapping, id) {
    let parsedRow = {};
    let bridgeValues = [];
    for (let field of mapping) {
        let value = null;
        let bridgeValue = null;
        switch (field.strategy) {
            case 'flat':
                value = strategyFlatten(obj, field, id);
                break;
            case 'foreign_key_simple':
                value = strategyForeignKeySimple(obj, field, id);
                break;
            case 'foreign_key_type':
                value = strategyForeignKeyType(obj, field, id);
                break;
            case 'foreign_key_bridge':
                [value, bridgeValue] = strategyForeignKeyBridge(obj, field, id);
                if ( bridgeValue) {
                    bridgeValues.push(bridgeValue);
                }
                break;
            default:
                value = strategyNormal(obj, field, id);
        }

        if (value !== null && typeof value !== 'undefined') {
            parsedRow = Object.assign({}, parsedRow, value);
        }
    }
    return { parsedRow, bridgeValues };
}

function transformResponse(hits, mapping) {
    let result = hits.map((hit) => parseObject(hit._source, mapping, hit._source.id));
    let rows = result.map(r => r.parsedRow);
    let allBridgeValues = result.flatMap(r => r.bridgeValues);
    let bridgeRows = mergeBridgeValues(allBridgeValues);
    return { rows, bridgeRows };
}

module.exports = {
    transformResponse
}
