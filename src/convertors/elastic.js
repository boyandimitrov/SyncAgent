const { v4: uuidv4 } = require('uuid');
const {transformers} = require('../transformers');
const importer = require("../../AppUI/core/importer")

function processField(obj, field, id, callback) {
    if (obj && obj[field.src_column]) {
        return callback(obj[field.src_column], field, id);
    } else {
        console.log(`${id} has missing value for ${field.src_type}`);
        return null;
    }
}

function strategyFlatten(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const result = parseObject(obj[field.src_column], field.flatten, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            return result.value;
        }
    });
}

function strategyForeignKeySimple(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const result = parseObject(obj[field.src_column], field.fk, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            return result.value;
        }
    });
}

function strategyFaker(obj, field, id, ctx) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_schema = field.fk[0];
        const result = importer.get_item_from_table(ctx.fakers, fk_schema.faker_type);

        if (result !== null && typeof result !== 'undefined') {
            return {[fk_schema.trgt_column] : result[fk_schema.faker_column]};
        }
    });
}

function strategyForeignKeyType(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_obj = obj[field.src_column];
        const fk_schema = field.fk[0];

        const type = fk_obj[fk_schema.src_type_column];

        if (!(fk_schema.src_types || []).includes(type)) {
            console.error("unsupported type");
            return null;
        }

        let result = fk_obj[fk_schema.src_column];
        if (result !== null && typeof result !== 'undefined') {
            return {[fk_schema.trgtcolumn + type] : result};
        }
    });
}

function strategyForeignKeyValueArray(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_obj = obj[field.src_column];
        const fk_schema = field.fk[0];

        let bridge_rows = [] ;
        for ( let arr_val of fk_obj ) {
            let row = {
                [fk_schema.trgt_primary] : id, 
                [fk_schema.trgt_column] : arr_val 
            }

            if ( fk_schema.trgt_id_type) {
                row[fk_schema.trgt_type_column] = fk_schema.trgt_id_type;
            }

            bridge_rows.push(row);
        }

        let bridge = {[fk_schema.trgt_bridge] : bridge_rows}
        return { value: {}, bridgeValue : bridge};        
    });
}

function strategyForeignKeyArrayLast(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_obj = obj[field.src_column] || [];
        if ( !fk_obj.length ) {
            return {};
        }

        const fk_schema = field.fk[0];

        let lastElement = fk_obj[fk_obj.length-1];
        return {[fk_schema.trgt_column] : lastElement[fk_schema.src_column]};
    });
}

function strategyForeignKeyArrayIndex(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_obj = obj[field.src_column] || [];
        if ( !fk_obj.length ) {
            return {};
        }

        const fk_schema = field.fk[0];

        let lastElement = fk_obj[field.index];
        if (lastElement) {
            return {[fk_schema.trgt_column] : lastElement[fk_schema.src_column]};
        }
        return {};
    });
}

function strategyForeignKeyBridge(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_objs = obj[field.src_column] || [];
        const fk_schema = field.fk[0];

        let bridge_rows = [] ;
        fk_objs.forEach(fk_obj => {
            bridge_rows.push({
                [fk_schema.trgt_primary] : id, 
                [fk_schema.trgt_column] : fk_obj[fk_schema.src_column] 
            })
        })
        let bridge = {[fk_schema.trgt_bridge] : bridge_rows}
        return { value: {}, bridgeValue : bridge};
    });
}

function strategyForeignKeyLookup(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const fk_objs = obj[field.src_column] || [];
        const fk_schema = field.fk[0];

        let bridge_rows = [] ;
        fk_objs.forEach(fk_obj => {
            bridge_rows.push({
                id : uuidv4(), 
                [fk_schema.trgt_column] : id,
                [fk_schema.trgt_column_value] : fk_obj[fk_schema.trgt_column]
            })
        })
        let bridge = {[fk_schema.trgt_bridge] : bridge_rows}
        return { value: {}, bridgeValue : bridge};
    });
}

function strategyDefault(obj, field, id) {
    try {
        let value = obj[field.src_column];
        if (field.src_column === '_id') {
            value = id;
        }
        const transformer = field.transformer;
        if (transformer && transformers[transformer]) {
            value = transformers[transformer](value, field);
        }

        if (typeof value === 'undefined') {
            return null;
        }

        if ( field.trgt_type !== 'CUSTOM') {
            return {[field.trgt_column] : value};
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

function strategyArraySimple(obj, field, id) {
    try {
        let value = obj[field.src_column];
        if (value && Array.isArray(value) && value.length) {
            return {[field.trgt_column] : value};
        }
    }
    catch (e) {
        console.error(e);
    }

    return null
}

function strategyObjectSimple(obj, field, id) {
    try {
        let value = obj[field.src_column];
        // is not empty object check
        if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
            return {[field.trgt_column] : value};
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

function parseObject(obj, mapping, id, ctx) {
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
                if ( value?.bridgeValue) {
                    bridgeValues.push(value.bridgeValue);
                }
                value = value?.value;
                break;
            case 'foreign_key_array_last' : 
                value = strategyForeignKeyArrayLast(obj, field, id);
                break;
            case 'foreign_key_array_index' : 
                value = strategyForeignKeyArrayIndex(obj, field, id);
                break;
            case 'faker' : 
                value = strategyFaker(obj, field, id, ctx);
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
            case "arraySimple" : 
                value = strategyArraySimple(obj, field, id);
                break;
            case "objectSimple" : 
                value = strategyObjectSimple(obj, field, id);
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

function elasticToUniversal(hits, mapping, fakers) {
    let ctx = {fakers:fakers};
    let result = hits.map((hit) => parseObject(hit._source, mapping, hit._id, ctx));
    let rows = result.map(r => r.value);
    let allBridgeValues = result.flatMap(r => r.bridgeValues);
    let bridgeRows = mergeBridgeValues(allBridgeValues);
    return { rows, bridgeRows };
}

module.exports = {
    elasticToUniversal
}
