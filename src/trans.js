const EventEmitter = require('events');
const CustomStrategyEmitter = require('./emitter');
const elastic = require("./sources/es.js");
const bigquery = require("./sources/bq.js");

const customEmitter = new CustomStrategyEmitter();
class SyncManager extends EventEmitter {
    constructor() {
        super();
        this.shouldContinueSync = true;
    }

    async synchronize() {

        let hit = await elastic.getLastSyncResource();
        let latestTimestamp;
        if (hit?.lastSync) {
            const date = new Date(hit.lastSync);

            // Add one month
            date.setMonth(date.getMonth() + 1);

            syncTimestamp = date.getTime();
        }
        else {
            syncTimestamp = await bigquery.getLastTransactionDate();
        }

        if(!lastSync) {
            console.log("cannot retrieve last updated and now sync will happen");

            return;
        }        

        await bigquery.getTransactions(syncTimestamp, 0, async(records) => {
            await elastic.updateShopQuantities(records);
        });

        await elastic.saveLastSyncResource(hti?.id || null, latestTimestamp);
    }

    async syncAndSetTimeout() {
        if (!this.shouldContinueSync) {
            return;
        }

        await this.synchronize();

        setTimeout(() => this.syncAndSetTimeout(mapping), process.env.TRANSACTIONS_SYNC_INTERVAL);
    }

    startSync() {
        this.syncAndSetTimeout();
    }


    stopSync() {
        this.shouldContinueSync = false;
        this.emit('stopSync');
    }
}

module.exports = SyncManager;
