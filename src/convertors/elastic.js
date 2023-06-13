const { v4: uuidv4 } = require('uuid');
const {transformers} = require('../transformers');

function processField(obj, field, id, callback) {
    if (obj && obj[field.es_column]) {
        return callback(obj[field.es_column], field, id);
    } else {
        console.log(`${id} has missing value for ${field.es_type}`);
        return null;
    }
}

function strategyFlatten(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const result = parseObject(obj[field.es_column], field.flatten, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            return result.value;
        }
    });
}

function strategyForeignKeySimple(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const result = parseObject(obj[field.es_column], field.fk, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            return result.value;
        }
    });
}


function strategyForeignKeyType(obj, field, id) {
    return processField(obj, field, id, async (value, field, id) => {
        const fk_obj = obj[field.es_column];
        const fk_schema = field.fk[0];

        const type = fk_obj[fk_schema.es_type_column];

        if (!(fk_schema.es_types || []).includes(type)) {
            console.error("unsupported type");
            return null;
        }

        let result = fk_obj[fk_schema.es_column];
        if (result !== null && typeof result !== 'undefined') {
            return {[fk_schema.bq_column + type] : result};
        }
    });
}

function strategyForeignKeyValueArray(obj, field, id) {
    return processField(obj, field, id, async (value, field, id) => {
        const fk_obj = obj[field.es_column];
        const fk_schema = field.fk[0];

        let result = {};
        for ( let id of fk_obj ) {
            if (id !== null && typeof id !== 'undefined') {
                result[fk_schema.bq_column] = id;
            }
        }
        return result;
    });
}

function strategyForeignKeyArrayLast(obj, field, id) {
    return processField(obj, field, id, async (value, field, id) => {
        const fk_obj = obj[field.es_column] || [];
        const fk_schema = field.fk[0];

        let lastElement = fk_obj[fk_obj.length-1];
        return {[fk_schema.bq_column] : lastElement[fk_schema.es_column]};
    });
}

function strategyForeignKeyBridge(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
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
        return { value: {}, bridgeValue : bridge};
    });
}

function strategyForeignKeyLookup(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_objs = obj[field.es_column] || [];
        const fk_schema = field.fk[0];

        let bridge_rows = [] ;
        fk_objs.forEach(fk_obj => {
            bridge_rows.push({
                id : uuidv4(), 
                [fk_schema.bq_column] : id,
                [fk_schema.bq_column_value] : fk_obj[fk_schema.es_column]
            })
        })
        let bridge = {[fk_schema.bq_bridge] : bridge_rows}
        return { value: {}, bridgeValue : bridge};
    });
}

function strategyDefault(obj, field, id) {
    try {
        let value = obj[field.es_column];
        const transformer = field.transformer;
        if (transformer && transformers[transformer]) {
            value = transformers[transformer](value, field);
        }
        if ( field.bq_type !== 'CUSTOM') {
            return {[field.bq_column] : value};
        }
        else {
            return value;
        }
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
            case 'foreign_key_value_array':
                value = strategyForeignKeyValueArray(obj, field, id);
                break;
            case 'foreign_key_array_last' : 
                value = strategyForeignKeyArrayLast(obj, field, id);
                break;
            case 'foreign_key_bridge':
                let fk_value = strategyForeignKeyBridge(obj, field, id);
                if ( fk_value?.bridgeValue) {
                    bridgeValues.push(fk_value.bridgeValue);
                }
                value = fk_value?.value;
                break;
            case 'foreign_key_lookup':
                value = strategyForeignKeyLookup(obj, field, id);
                if ( value?.bridgeValue) {
                    bridgeValues.push(value.bridgeValue);
                }
                value = value?.value;
                break;
            default:
                value = strategyDefault(obj, field, id);
        }

        if (value !== null && typeof value !== 'undefined') {
            parsedRow = Object.assign({}, parsedRow, value);
        }
    }
    return { value : parsedRow, bridgeValues };
}

function elasticToUniversal(hits, mapping) {
    let result = hits.map((hit) => parseObject(hit._source, mapping, hit._source.id));
    let rows = result.map(r => r.value);
    let allBridgeValues = result.flatMap(r => r.bridgeValues);
    let bridgeRows = mergeBridgeValues(allBridgeValues);
    return { rows, bridgeRows };
}

module.exports = {
    elasticToUniversal
}
