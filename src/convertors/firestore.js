const safeEval = require('safe-eval');
const {transformers} = require('../transformers');

function processField(obj, field, id, callback) {
    if (obj && obj[field.src_column]) {
        return callback(obj[field.src_column], field, id);
    } else {
        console.log(`${id} has missing value for ${field.src_type}`);
        return null;
    }
}

function strategyDefault(obj, field, id) {
    try {
        let value = obj[field.src_column];
        const transformer = field.transformer;
        if (transformer && transformers[transformer]) {
            value = transformers[transformer](value, field);
        }
        if ( value && field.trgt_type !== 'CUSTOM') {
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

function strategyFormula(obj, field, id) {
    let value = null;
  
    try {
        // Create a context object with values of necessary fields
        let context = {};
        for (let column of field.src_columns) {
            context[column] = obj[column] || false;
        }
  
        // Evaluate the formula
        value = safeEval(field.formula, context);
  
    } 
    catch (e) {
        console.error(`Error evaluating formula for id ${id}: ${e.message}`);
        return null;
    }
  
    // Apply the transformer if it exists
    const transformer = field.transformer;
    if (transformer && transformers[transformer]) {
        value = transformers[transformer](value, field);
    }
  
    // Convert to BigQuery suitable structure
    return {[field.trgt_column] : value};
}

function strategyAggregation(obj, field, id) {
    let value = 0;
  
    try {

        for ( let item of obj[field.src_column]) {
            if ( field.aggregation === "sum_formula" ) {
                let context = {};
                for (let column of field.aggregation_columns) {
                    context[column] = item[column] || 0;
                }
          
                // Evaluate the formula
                const agg_result = safeEval(field.aggregation_formula, context);
                value += agg_result;
            }
        }
    } 
    catch (e) {
        console.error(`Error evaluating formula for id ${id}: ${e.message}`);
        return null;
    }
  
    // Apply the transformer if it exists
    const transformer = field.transformer;
    if (transformer && transformers[transformer]) {
        value = transformers[transformer](value, field);
    }
  
    // Convert to BigQuery suitable structure
    return {[field.trgt_column] : value};
}
  
function strategyForeignTable(obj, field, id, mapping) {
    // "fb_column" : "transactionLines",
    // "fb_type" : "array",
    // "strategy" : "foreign_table",
    // "fb_table" : "transactionLines"
    const fk_rows = obj[field.src_column] || [];
    const fk_table_schema = mapping.bridges.filter(({trgt}) => trgt === field.trgt_table)[0];

    let bridgeRows = [];
    for ( let row of fk_rows ) {
        const result = parseObject(row, fk_table_schema, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            bridgeRows.push( result.value);
        }
    
    }

    let bridge = {[field.src_table] : bridgeRows}
    return { value: {}, bridgeValue : bridge};
}

function strategyForeignKeySimple(obj, field, id) {
    return processField(obj, field, id, (value, field, id) => {
        const result = parseObject(obj[field.src_column], {mapping: field.fk}, id);
        if (result?.value !== null && typeof result?.value !== 'undefined') {
            return result.value;
        }
    });
}

function strategyForeignKeyParent(obj, field, id) {
    return {[field.trgt_column] : id};
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
    for (let field of mapping.mapping) {
        switch (field.strategy) {
            case 'formula':
                value = strategyFormula(obj, field, id);
                break;
            case 'aggregate':
                value = strategyAggregation(obj, field, id);
                break;
            case 'foreign_key_simple':
                value = strategyForeignKeySimple(obj, field, id);
                break;
            case 'foreign_key_parent':
                value = strategyForeignKeyParent(obj, field, id);
                break;
            case 'foreign_table':
                let fk_value = strategyForeignTable(obj, field, id, mapping);
                if ( fk_value?.bridgeValue) {
                    bridgeValues.push(fk_value.bridgeValue);
                }
                value = fk_value?.value;
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

function firestoreToUniversal(docs, mapping) {
    let result = docs.map(doc => parseObject(doc, mapping, doc.id));
    let rows = result.map(r => r.value);
    let allBridgeValues = result.flatMap(r => r.bridgeValues);
    let bridgeRows = mergeBridgeValues(allBridgeValues);
    return { rows, bridgeRows };
}

module.exports = {
    firestoreToUniversal
}
