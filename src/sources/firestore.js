const admin = require("firebase-admin");
const convertor = require("../convertors/firestore");

const serviceAccount = require("../../certs/promoto-bcaef-firebase-adminsdk-s666c-303061354d.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://promoto-bcaef-default-rtdb.europe-west1.firebasedatabase.app"
});

const fbClient = admin.firestore();

async function _search(mapping, latestTimestamp, latestId) {
    let rows = [];

    const collection = fbClient.collection(mapping[mapping.source])

    let query1 = collection.orderBy(mapping.sync_column, 'asc').orderBy(mapping.id_column, 'asc');

    if (latestTimestamp !== null) {
        query1 = query1.where(mapping.sync_column, '>', latestTimestamp);
    }
    
    query1 = query1.limit(mapping.sync_batch_size || 5);

    const querySnapshot = await query1.get();
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        rows.push(doc.data());
    });
        // let query2 = db.collection(mapping.es)
        // .where(mapping.sync_column, '>=', latestTimestamp)
        // .where(mapping.id_column, '>', latestId)
        // .orderBy(mapping.sync_column, 'asc')
        // .orderBy(mapping.id_column, 'asc')
        // .limit(mapping.sync_batch_size || 5);
    

    let i = 0;

    if ( rows?.length) {
        ///retrieve subcollections one level. if need support for more levels , need new implementation
        const subs = mapping.mapping.filter(({strategy}) => strategy === "foreign_table");

        for (const row of rows ) {
            for ( const sub of subs) {
                const subSnapshot = await fbClient.collection(mapping[mapping.source]).doc(row.id).collection(sub.fb_table).get();
      
                row[sub.fb_table] = [];
                subSnapshot.forEach((subDoc) => {
                    console.log(subDoc.id, " => ", subDoc.data());
                    const item = subDoc.data()
                    item.id = subDoc.id;
                    row[sub.fb_table].push(item);
                });
            }
        }
    }

    return rows;
}

async function search(mapping, latestTimestamp, latestId) {
    const docs = await _search(mapping, latestTimestamp, latestId);

    if (docs?.length) {
        const {rows, bridgeRows} = convertor.firestoreToUniversal(docs, mapping);

        // Remember NEWest timestamp of the last synced document
        syncTimestamp = docs[docs.length - 1][mapping.sync_column];
        syncId = docs[docs.length - 1][mapping.sync_id_column];
    
        return {rows, bridgeRows, syncTimestamp, syncId};
    }

    return {rows:[]};
}

module.exports = {
    search
}