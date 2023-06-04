const bq = require('./bq');
const CustomStrategyEmitter = require('./emitter');

const customEmitter = new CustomStrategyEmitter();

asyncEventEmitter.on('rowsUpserted', async ({table, rows}) => {
    // Simulate async work

    rows = rows.map(row => {
        return {
            id : row.id,
            name : row.name,
            type: table,
            timestamp : new Date().toISOString()
        }
    })

    await bq.insertRows(table, rows);
});