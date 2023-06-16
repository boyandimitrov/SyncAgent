const { faker } = require('@faker-js/faker');
const db = require("./db");

const foreign_tables = ["product", "users", "shop", "checkout"];

const INSERT_BATCH = 1000;

const get_value = (field) => {
    let value;
    if ( field.farr ) {
        return field.farr[faker[field.fobj][field.ffunc](field.fparam)];
    }
    else if ( field.fobj && field.ffunc) {
        if ( field.fparam && field.sparam) {
            value = faker[field.fobj][field.ffunc](field.fparam, field.sparam);
        }
        else if ( field.fparam ) {
            value = faker[field.fobj][field.ffunc](field.fparam);
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

const get_item_from_table = (tables, table_name) => {
    let t = tables[table_name] || {};
    let random = faker.datatype.number(t.count-1);
    // console.log(random);
    // console.log(JSON.stringify(p.items[random][Object.keys(p.items[random])[0]]));
    return t.rows[random];
}

const fake_past_date = (years) => {
    let now = new Date();
    let fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(now.getFullYear() - years);
    
    // Returns a random integer between min (inclusive) and max (inclusive).
    function getRandomIntInclusive(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Get timestamp of dates
    let nowTs = now.getTime();
    let fiveYearsAgoTs = fiveYearsAgo.getTime();
    
    // Generate a random timestamp between now and five years ago
    let randomTs = getRandomIntInclusive(fiveYearsAgoTs, nowTs);
    
    // Create a new date object with the random timestamp
    let randomDate = new Date(randomTs);
    
    console.log(randomDate);
    return randomDate;    
}

const setCreated = (item) => {
    let created = fake_past_date(5);
    item.created_master = created.toISOString();
    item.created_quarter = Math.floor(created.getMonth() / 3 + 1);
    item.created_half = Math.floor(created.getMonth() / 6 + 1);
    item.created_year = created.getFullYear();
    item.created_month = Math.floor(created.getMonth() + 1);
    item.created_date = created.getDate();
    item.created_day = created.getDay() + 1;
    item.created_week = (d => {
        let dUtc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        let dayNum = dUtc.getUTCDay() || 7;
        dUtc.setUTCDate(dUtc.getUTCDate() + 4 - dayNum);
        let yearStart = new Date(Date.UTC(dUtc.getUTCFullYear(),0,1));
        return Math.ceil((((dUtc - yearStart) / 86400000) + 1)/7)

    })(created);
}

const fake_transaction = (items_count=1000, tables = {}) => {
    let items = [];

    for (let i=0; i< items_count; i++ ) {
        let item = {
            id : get_value({fobj: "datatype", ffunc : "uuid"}),
            firebaseTenantId : get_value({fobj: "random", ffunc : "alpha", fparam : {length: 8, casing: 'upper'}}),
            receiptNumber	: get_value({fobj: "datatype", ffunc : "number", fparam : {  min:10000, max: 99999 }}),
            updated	: get_value({fobj: "date", ffunc : "past"}),
            fk_user	: get_item_from_table(tables, "users")["id"],
            fk_shop	: get_item_from_table(tables, "shop")["id"],
            fk_checkout	: get_item_from_table(tables, "checkout")["id"],
            timestamp: new Date().toISOString(),
            status : get_value({farr : ["inProgress", "reversed", "completed"], fobj: "datatype", ffunc : "number", fparam : { min:0, max: 2 }})
        };

        setCreated(item);
        items.push(item);
    }

    return items;
}

const fake_transaction_lines = (items_count=1000, tables = {}) => {
    let items = [];

    for (let i=0; i< items_count; i++ ) {
        let item = {
            code : get_value({fobj: "random", ffunc : "alpha", fparam : {length: 8, casing: 'upper'}}),
            created : get_value({fobj: "date", ffunc : "past"}),
            inPromotion	: get_value({fobj: "datatype", ffunc : "boolean", fparam : { probability: 0.1 }}),
            price : get_value({fobj: "commerce", ffunc : "price", fparam : 0, sparam:100}),
            quantityType : get_value({farr : ["count", "kgs"], fobj: "datatype", ffunc : "number", fparam : { min:0, max: 1 }}),
            quantityValue : get_value({fobj: "datatype", ffunc : "number", fparam : { min:0, max: 100 }}),
            updated	: get_value({fobj: "date", ffunc : "past"}),
            fk_product	: get_item_from_table(tables, "product")["id"],
            fk_transaction	: get_item_from_table(tables, "transaction")["id"],
            timestamp: new Date().toISOString(),
            id : get_value({fobj: "datatype", ffunc : "uuid"}),
        };

        items.push(item);
    }

    return items;
}

const fake = async () => {

    let input = {
        dataset : "Mall",
        table : "transaction",
        view : "transaction"
    }
    let tables = await db.load_tables(foreign_tables, {dataset : "Mall"});
    tables["transaction"] = {
        rows: []
    };

    let items_count = 100;
    do {
        let batch_count = items_count >= INSERT_BATCH ? INSERT_BATCH : items_count;

        const transactions = await fake_transaction(batch_count, tables);
        let transaction_ids = transactions.map(({id}) => {return {id : id}});
        tables["transaction"].rows = tables["transaction"].rows.concat(transaction_ids);

        await db.import_rows(transactions, input);
        
        items_count -= INSERT_BATCH;
    }
    while ( items_count > 0);

    input.table = "transactionLines";
    input.view = "transactionLines";
    items_count = 20000;
    tables["transaction"].count = tables["transaction"].rows.length;
    do {
        let batch_count = items_count >= INSERT_BATCH ? INSERT_BATCH : items_count;

        const items = await fake_transaction_lines(batch_count, tables);

        await db.import_rows(items, input);
        
        items_count -= INSERT_BATCH;
    }
    while ( items_count > 0);
}

module.exports = {
    fake
}