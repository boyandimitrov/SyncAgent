const randomizer = require('./randomizer.js');
const dm = require('../api/data_manipulation');
const { faker } = require('@faker-js/faker');

const generate = (schema, items_count=1000) => {
    let items = [];

    for (let i=0; i< items_count; i++ ) {
        let item = {};
        for (let j=0; j < schema.length; j++ ) {
            const field = schema[j];
            switch ( field.type )  {
                case "date" :
                    item[field.name] = randomizer.generate_date(field.from, field.to);
                    break;
                case "int64" :
                    item[field.name] = randomizer.generate_number(field.range);
                    break;
                case "numeric" :
                    item[field.name] = randomizer.generate_number(field.range);
                    break;
                case "string" :
                    item[field.name] = randomizer.generate_text(field.words);
                    break;
                default:
                    throw 'this item type is not implemented.'
            }

        }

        items.push(item);
    }

    return items;
}

const get_value = (field, current, ctx) => {
    let value;
    if (field.const) {
        value = field.const;
    }
    else if(field.table) {
        const dataset = ctx.dataset;
        const table = field.table;
        // const count = dm.
        // value = 
    }
    else if ( field.fobj && field.ffunc) {
        if ( field.multiply) {
            value = faker[field.fobj][field.ffunc]() * current[field.multiply];
        }
        else if (field.param) {
            value = faker[field.fobj][field.ffunc]( current[field.param] );
        }
        else if ( field.fparam ) {
            value = faker[field.fobj][field.ffunc](field.fparam);
            // if ( field.type === 'datetime') {
            //     console.log(value);
            // }
        }
        else {
            value = faker[field.fobj][field.ffunc]();
        }
    }
    else {
        console.error( "unknown field descriptor", JSON.stringify(field));
    }

    return value;
}

const get_item_from_pool = (pools, pool_name) => {
    let p = pools[pool_name] || {};
    let random = faker.datatype.number(p.count-1);
    // console.log(random);
    // console.log(JSON.stringify(p.items[random][Object.keys(p.items[random])[0]]));
    return p.items[random];
}

const get_item_from_table = (tables, table_name) => {
    let t = tables[table_name] || {};
    let random = faker.datatype.number(t.count-1);
    // console.log(random);
    // console.log(JSON.stringify(p.items[random][Object.keys(p.items[random])[0]]));
    return t.rows[random];
}

const fake = (schema, items_count=1000, pools = {}, tables = {}, ctx) => {
    let items = [];

    for (let i=0; i< items_count; i++ ) {
        let item = {};
        for (let j=0; j < schema.length; j++ ) {
            const field = schema[j];

            if(field.pool) {
                let pool_item = get_item_from_pool(pools, field.pool)
                item = {...item, ...pool_item};
            }
            else if ( field.table ) {
                let table_item = get_item_from_table(tables, field.table);
                item = {...item, ...table_item};
            }
            else {
                item[field.name] = get_value(field, item);
            }
        }

        items.push(item);
    }

    return items;
}

const fake_pools = (pools, tables = {}, ctx) => {
    let result = {};

    (pools || []).forEach(p => {
        result[p.name] = {
            count : p.count
        }

        let items = [];
        for ( let i=0; i < p.count; i++ ) {
            let item = {};
            (p.properties || []).forEach(prop => {
                if ( prop.table ) {
                    let {id} = get_item_from_table(tables, prop.table);
                    let table_item = {[prop.name] : id}
                    item = {...item, ...table_item};
                }
                else {
                    item[prop.name] = get_value(prop, item);
                }
            })

            items.push(item);
        }

        result[p.name].items = items;
    });

    return result;
}

module.exports = { generate, fake, fake_pools }
