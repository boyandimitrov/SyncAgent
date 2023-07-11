const { faker } = require('@faker-js/faker');
const db = require("./db");

const foreign_tables = ["product_base", "users", "shop", "checkout", "manufacturer", "store", "distributor"];

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
        else if ( field.fparam && field.iparam) {
            let fake_val = faker[field.fobj][field.ffunc](field.fparam);
            if ( field.iparam.multiply) {
                value = field.iparam.multiply * fake_val;
            }
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

function get_promotion(tables) {
    const randomInt = faker.number({min:1, max:100});

    if ( randomInt <= 5) {
        return 
    }
    return null;
}

const fake_transaction_lines = (items_count=1000, tables = {}) => {
    let items = [];

    for (let i=0; i< items_count; i++ ) {
        let item = {
            inPromotion : false,
            code : get_value({fobj: "random", ffunc : "alpha", fparam : {length: 8, casing: 'upper'}}),
            created : get_value({fobj: "date", ffunc : "past"}),
            price : get_value({fobj: "commerce", ffunc : "price", fparam : 0, sparam:100}),
            quantityType : get_value({farr : ["count", "kgs"], fobj: "datatype", ffunc : "number", fparam : { min:0, max: 1 }}),
            quantityValue : get_value({fobj: "datatype", ffunc : "number", fparam : { min:0, max: 100 }}),
            updated	: get_value({fobj: "date", ffunc : "past"}),
            fk_product	: get_item_from_table(tables, "product_base")["id"],
            fk_transaction	: get_item_from_table(tables, "transaction")["id"],
            fk_manufacturer	: get_item_from_table(tables, "manufacturer")["id"],
            fk_store	: get_item_from_table(tables, "store")["id"],
            fk_distributor	: get_item_from_table(tables, "distributor")["id"],
            fk_distributor_store : get_item_from_table(tables,"distributor_store")["id"],
            timestamp: new Date().toISOString(),
            id : get_value({fobj: "datatype", ffunc : "uuid"}),
        };

        item.profit = get_value({fobj: "datatype", ffunc : "number", fparam : { min:10, max: 50 }, iparam : { multiply : (parseFloat(item.price) / 100)} });

        if ( i % 100 <= 5 ) {
            item.inPromotion = true
            const promotion = get_item_from_table(tables,"promotion");
            item.fk_promotion = promotion.id;

            if ( i % 10 === 3) {
                item.discount = (i % 5) * 4;
            }
            else {
                item.discount = promotion.percent;
            }
        }

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
    let promotions = await db.load_tables(["promotion"], {dataset : "Mall", fields : ["id", "percent"]});
    let arrays = {
        "distributor_store" : {
            count : 4,
            rows : [{
                "id": "2cc860ee-a0ed-4817-a094-4bbf45f7321a"
              }, {
                "id": "2f96abd2-3962-4698-9968-7c1084d41a79"
              }, {
                "id": "f2e6f660-bfcb-4c31-b6d0-7869c58341f2"
              }, {
                "id": "f4265839-e82f-40a8-be04-e906b876d085"
              }]
        }
    }

    tables = { ...tables, ...promotions, ...arrays };

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

const fake_promotions = async () => {
    let input = {
        dataset : "Mall",
        table : "promotion",
        view : "promotion"
    }

    let promotions = {
        "promotion" : {
            count : 5,
            rows : [
                {
                    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                    "name" : "2 в 1",
                    "fk_manufacturer" : "5675735d-90a9-46da-88f2-21cd9af351d5",
                    "percent" : 10,
                    "timestamp" : new Date().toISOString()
                }, 
                {
                    "id": "3d577e73-8557-44a1-8b79-3c2f5259e37f",
                    "name" : "Месо и месни",
                    "fk_manufacturer" : "b2f0f18d-f910-4c8c-8d23-6611532bf82d",
                    "percent" : 14,
                    "timestamp" : new Date().toISOString()
                }, 
                {
                    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
                    "name" : "Always Coca Cola",
                    "fk_manufacturer" : "5675735d-90a9-46da-88f2-21cd9af351d5",
                    "percent" : 25,
                    "timestamp" : new Date().toISOString()
                }, 
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "name" : "Девин от извора",
                    "fk_manufacturer" : "99b562b0-15e2-42ed-898e-d0ad163a4c2f",
                    "percent" : 10,
                    "timestamp" : new Date().toISOString()
                }, 
                {
                    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
                    "name" : "Чиста вода, много пари",
                    "fk_manufacturer" : "99b562b0-15e2-42ed-898e-d0ad163a4c2f",
                    "percent" : 5,
                    "timestamp" : new Date().toISOString()
                }]
        }
    }

    await db.import_rows(promotions.promotion.rows, input);

}

module.exports = {
    fake, get_item_from_table, fake_promotions
}