const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery({
    projectId: process.env.BQ_ID,
    keyFilename: process.env.BQ_CERT_FILE,
});

async function createSchema(mappings) {
    for ( const mapping of mappings) {
        const tableName = mapping.bq;
        // const columns = mapping.mapping.map(({bq_column, bq_type}) => {
        //     return {
        //         name: bq_column, 
        //         type: bq_type,
        //     }
        // })

        await createTable(tableName, mapping.mapping );

        const bridges = mapping.bridges || [];
        for ( const bridge of bridges) {
            const tableName = bridge.bq;
    
            await createTable(tableName, bridge.mapping );
        }
    }
}

// async function createTable(tableName, schema) {

//     const dataset = bigquery.dataset(process.env.BQ_DATASET);
//     const table = dataset.table(tableName);

//     // Check if the table exists
//     const [exists] = await table.exists();

//     if (!exists) {
//         // Only create the table if it does not exist
//         await table.create({ schema });
//     }
//     console.log(`Table ${table.id} created.`);
// }

async function createTable(tableName, schema) {
    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const table = dataset.table(tableName);

    // Function to recursively modify the schema to handle object types
    function flattenSchema(fields) {
        const modifiedSchema = [];
        for (const field of fields) {
            if (field.strategy === 'flat' && field.flatten) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.flatten);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'foreign_key_simple' && field.fk) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.fk);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'faker' && field.fk) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.fk);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'foreign_key_type' && field.fk) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.fk);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'foreign_key_array_last' && field.fk) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.fk);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'foreign_key_array_index' && field.fk) {
                // flatten the object into its properties
                const nestedFields = flattenSchema(field.fk);
                modifiedSchema.push(...nestedFields);
            } 
            else if (field.strategy === 'foreign_key_value_array' && field.fk) {
            } 
            else if (field.strategy === 'foreign_key_lookup' && field.fk) {
            } 
            else if (field.strategy === 'foreign_key_bridge' && field.fk) {
                // do nothing
            } 
            else if (field.strategy === 'foreign_table') {
                // do nothing
            } 
            else {
                if ( field.es_types ) {
                    field.es_types.forEach(type => {
                        modifiedSchema.push({
                            name: field.bq_column + type,
                            type: field.bq_type,
                            mode: 'NULLABLE'
                        });
                    })
                }
                else if ( field.derivatives) {
                    field.derivatives.forEach(derivative => {
                        modifiedSchema.push({
                            name: `${field.bq_column}_${derivative.suffix}`,
                            type: derivative.bq_type,
                            mode: 'NULLABLE'
                        });                        
                    })
                }
                else {
                    modifiedSchema.push({
                        name: field.bq_column,
                        type: field.bq_type,
                        mode: 'NULLABLE'
                    });
    
                }
            }
        }
        return modifiedSchema;
    }

    const modifiedSchema = flattenSchema(schema);

    // Check if the table exists
    const [exists] = await table.exists();

    if (!exists) {
        // Only create the table if it does not exist
        await table.create({ schema: modifiedSchema });
    }
    console.log(`Table ${table.id} created.`);
}

async function getLastSyncRecord(tableName) {
    const query = `SELECT id, timestamp FROM ${process.env.BQ_DATASET}.${tableName} ORDER BY timestamp DESC, id DESC LIMIT 1`;
    const options = {
        query: query,
        location: 'US',
    };
    const [rows] = await bigquery.query(options);
    if ( rows?.length ) {
        return {syncId: rows[0].id, syncTimestamp : rows[0].timestamp?.value};
    }
    return {syncId: null, syncTimestamp : null};
}

async function insertRows (tableName, rows) {
    
    const dataset = bigquery.dataset(process.env.BQ_DATASET);
    const table = dataset.table(tableName);

    await table.insert(rows, { ignoreUnknownValues: true });
}

module.exports = {
    createSchema, createTable, getLastSyncRecord, insertRows
}