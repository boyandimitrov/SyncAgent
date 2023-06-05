const admin = require("firebase-admin");

const serviceAccount = require("../../certs/promoto-bcaef-firebase-adminsdk-s666c-303061354d.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://promoto-bcaef-default-rtdb.europe-west1.firebasedatabase.app"
});

const fbClient = admin.firestore();

async function _search(mapping, latestTimestamp, latestId) {


    const collection = fbClient.collection(mapping[mapping.source])

    let query1 = collection.orderBy(mapping.sync_column, 'asc').orderBy(mapping.id_column, 'asc');

    if (latestTimestamp !== null) {
      query1 = query1.where(mapping.sync_column, '>', latestTimestamp);
    }
    
    query1 = query1.limit(mapping.sync_batch_size || 5);

    const querySnapshot = await query1.get();
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
    });
        // let query2 = db.collection(mapping.es)
        // .where(mapping.sync_column, '>=', latestTimestamp)
        // .where(mapping.id_column, '>', latestId)
        // .orderBy(mapping.sync_column, 'asc')
        // .orderBy(mapping.id_column, 'asc')
        // .limit(mapping.sync_batch_size || 5);
    

    let i = 0;

    return rows;
}

async function search(mapping, latestTimestamp, latestId) {
    return await _search(mapping, latestTimestamp, latestId);
}

module.exports = {
    search
}