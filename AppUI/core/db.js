const {BigQuery} = require('@google-cloud/bigquery');
const {logical_schema} = require('./logical_schema.js');

const bigquery = new BigQuery({
    projectId: process.env.BQ_ID,
    keyFilename: process.env.BQ_CERT_FILE,
});


function get_fields(params) {
    let fields = params.fields || [];

    let field_list = (params.group || []).map(item => {
        let idx = fields.indexOf(item.field);
        if ( idx > -1) {
            fields.splice(idx, 1);
        }

        if ( item.range ) {
            return build_case(item);
        }
        return item.field;
    });

    const filter_list = get_filter_fields(params.filter) || [];

    field_list = field_list.concat(filter_list);

    const aggr = (params.aggregation || []).map(item => {
        let idx = fields.indexOf(item.field);
        if ( idx > -1) {
            fields.splice(idx, 1);
        }

        const result = `${item.formula}(${item.field}) as func_${item.field}`;
        return result;
    });

    fields = fields.concat(field_list).concat(aggr);

    if ( !fields.length ) {
        throw "queries without a single field is not supproted."
    }

    return fields;
}

function iterate_filter_fields (filter, accumulator) {
    for(let key in filter){
        if (key === '$or' && Array.isArray( filter[key])){
            for (let i=0; i < filter[key].length; i++) {
                iterate_filter_fields(filter[key], accumulator)
            }
        }
        else {
            accumulator.push(key);
        }
    }//end for

}

function get_filter_fields(filter) {
    if ( ! filter) {
        return;     
    }

    let accumulator = [];
    iterate_filter_fields(filter, accumulator)

    return accumulator;
}

function build_select(params, fields) {
    const table = `\`${params.dataset}.${params.table}\``
    const select = `select ${fields.join(",")} from ${table}`
    return select;
}

function build_case({field, range}) {
    let cases = [];
    range.forEach((r, idx, data) => {
        let when = '';
        if ( idx === 0 ) {
            when = `when ${field} < ${r} then '0-${r}'`;
        }
        else {
            when = `when ${field} < ${r} then '${data[idx-1]}-${r}'`;
        }

        cases.push(when);

        if ( idx === data.length - 1 ) {
            cases.push(`else '${r}+'`)
        }
    })

    const result = ` case ${cases.join(" ")} end as ${field}`
    return result;

    // const case_when = `case

    // `;

    // CASE
    // WHEN A > 60 THEN 'red'
    // WHEN A > 30 THEN 'blue'
    // ELSE 'green'
    // END
    // AS result
}

const operators = {
    '$in' : 'IN',
    '$lt' : '<',
    '$ne' : '<>'
}

function operators_map(oper) {
    const result = operators[oper];
    if ( !result) {
        throw 'missing operator'
    }
    return result;
}

function itterate_filter_clause(fc, key, aliases) {

    let operator = '=';

    let value = fc[key];

    if ( key.indexOf(".") > -1 ) {
        let parts = key.split(".");
        parts[0] = aliases[parts[0]];
        key = parts.join(".");
    }

    if ( typeof value === 'object' ) {
        const operator_key = Object.getOwnPropertyNames(value)[0]
        operator = operators_map(operator_key);
        value = value[operator_key];

        let values= value.map(i => `'${i}'`);
        return ` ${key} ${operator} (${values}) `
    }

    // if ( !Array.isArray(value)) {
    //     value = [value]
    // }

    if ( typeof value === 'string') {
        value = `'${value}'`
    }

    return ` ${key} ${operator} ${value} `
}

function itterate_filter(filter, aliases = {}){
    var s = [];
    for(let key in filter){
        if (key === '$or' && Array.isArray( filter[key])){
            let ors = [];
            for (let i=0; i < filter[key].length; i++) {
                ors.push( itterate_filter(filter[key], aliases) );
            }
            s.push( ` ( ${ors.join(" or ")} ) ` )
        }
        // else if ( Object.keys(filter).length > 1) {
        //     s.push(itterate_filter(filter[key]));
        // }//end if
        else {
            s.push(itterate_filter_clause(filter, key, aliases))
        }
    }//end for
    return s.join(" and ");
}//end function

function build_filter(filter, aliases) {
    if ( ! filter ) {
        return "";
    }

    return ` where ${itterate_filter(filter, aliases)} `;
}

function build_group_by(group=[], aliases) {
    const field_list = group.map(item => {
        if ( item.field.indexOf(".") > -1 ) {
            let parts = item.field.split(".");
            parts[0] = aliases[parts[0]];
            item.field = parts.join(".");
        }        
        return item.field;
    });

    if ( !field_list.length ) {
        return "";
    }

    const group_by = `group by ${field_list}`
    return group_by;
}

function build_paging(paging = {}) {
    let result = "";
    if (paging.limit) {
        result += ` limit ${paging.limit}`
    }
    if ( paging.offset) {
        result += ` offset ${paging.offset}`
    }

    return result;
}

function build_joins(params, joins) {
    let result = (joins || []).map(join => {
        return ` join \`${params.dataset}.${join.ref_table}\` ${join.ref_table} on ${join.ref_key} = ${join.key} `
    })

    return result.join(" ");
}

function build_query(params, fields, joins, aliases) {
    const select = build_select(params, fields);
    const join = build_joins(params, joins);
    const filter = build_filter(params.filter, aliases);
    const group_by = build_group_by(params.group, aliases);
    const page = build_paging(params.paging);

    const query = `${select} ${join} ${filter} ${group_by} ${page}`;

    return query;
}

function build_count_query(params, joins, aliases) {
    const table = `\`${params.dataset}.${params.table}\``

    const select = `select COUNT(*) as row_count from ${table}`
    const join = build_joins(params, joins);
    const filter = build_filter(params.filter, aliases);

    const query = `${select} ${join} ${filter}  `;

    return query;
}

async function get_table_schema(params) {
    const query = `SELECT 
        TO_JSON_STRING(
            ARRAY_AGG(STRUCT( 
                IF(is_nullable = 'YES', 'NULLABLE', 'REQUIRED') AS mode,
                column_name AS name,
                data_type AS type)
            ORDER BY ordinal_position), TRUE) AS schema
        FROM
            ${params.dataset}.INFORMATION_SCHEMA.COLUMNS
        WHERE
            table_name = '${params.table}'`

    const options = {
        query: query
    };

    const [rows] = await bigquery.query(options);
    return JSON.parse(rows[0]['schema']);
}

async function count(params, joins, aliases) {
    const query_count = build_count_query(params, joins, aliases);
    const options = {
        query: query_count
    };
  
    const [rows] = await bigquery.query(options);
    return rows[0].row_count;
}

function get_joins(params, raw_fields) {
    let physical_schema = require(`../schema/${params.dataset}.${params.table}.json`);
    let schema = logical_schema(physical_schema);

    let aliases = {};
    let joins = [];
    let join_hash = {};
    let fields = raw_fields.map(raw => {
        if ( raw.indexOf('.') > -1) {
            let parts = raw.split(".");

            const col_schema = schema.filter(({name}) => name === parts[0])[0];
            if ( col_schema?.subtype === 'fk') {
                if ( !join_hash[col_schema.table]) {
                    joins.push({table: params.table, key:col_schema.name, ref_table: col_schema.table, ref_key : 'id'});
                    join_hash[col_schema.table] = 1;
                }
                aliases[col_schema.name] =  col_schema.table;

                return `${col_schema.table}.${parts[1]}`
            }
        }
        else {
            return raw;
        }
    })

    return {fields,joins, aliases};
}

async function query(params) {
    let raw_fields = get_fields(params);
    //const {fields, joins, aliases} = get_joins(params, raw_fields)
    //const query = build_query(params, fields, joins, aliases);
    const query = build_query(params, raw_fields);

    const options = {
      query: query
    };

    const [rows] = await bigquery.query(options);

    let result = {rows:rows};

    if (params.rows_count) {
        //result.rows_count = await count(params, joins, aliases);
        result.rows_count = await count(params, [], {});
    }

    //console.log('Rows:');
    //rows.forEach(row => console.log(row));

    return result;
}

async function custom_query(query) {
    const options = {
        query: query
    };
  
    await bigquery.query(options);
}

function aggregate(rows, params) {
    const result = rows.map(item => {
        return {
            group : params.group.map(group => {
                if ( group.field.indexOf(".") > -1 ) {
                    let parts = group.field.split('.');
                    return item[parts[1]];
                }
                return item[group.field]
            }),
            value : params.aggregation.map(aggregation => item[`func_${aggregation.field}`])
        }
    })

    return result;
}

const convert_to_rows = (items, schema) => {
    let rows = [];
    (items || []).forEach(item => {
        let row = {};

        schema.forEach(field => {
            if ( !field.func) {
                row[field.name] = item[field.name];
            }
            else {
                let main_name = field.name;
                if ( field.subtype ) {
                    main_name = field.name.replace(`_${field.subtype}`, "");
                }
                row[field.name] = field.func(item[main_name])
            }
        });

        rows.push(row);
    });
    return rows;
};

const import_rows = async (items, params) => {
    let physical_schema = require(`../schema/${params.dataset}.${params.view}.json`);
    let schema = logical_schema(physical_schema);

    let rows = convert_to_rows(items, schema);

    try {
        await bigquery
            .dataset(params.dataset)
            .table(params.table)
            .insert(rows);
    }
    catch(e) {
        console.error(e);
    }
    console.log(`Inserted ${rows.length} rows`);
};

const load_tables = async (tables, ctx) => {
    let result = {};
    tables = tables || [];
    for (let i=0; i < tables.length; i++) {
        const table = tables[i];
        const row_count = await count({table: table, dataset: ctx.dataset});

        result[table] = {
            count : row_count
        }

        const q = {
            "dataset" : ctx.dataset,
            "table" : table,
            "fields" : ctx.fields || ["id"],
            "paging" : {"limit" : row_count}
        }

        let data = await query(q);
        result[table].rows = data.rows;
    }
    return result;
}

module.exports = {
    query, aggregate, import_rows, load_tables, custom_query
}

