/**
 * Created by reinvantveer on 1/30/17.
 */

/**
 * Generic mongodb upsert function for multiple documents, based on _id match
 * @param dataArray an array of documents to ingest
 * @param collection
 * @returns {Promise} resolving to the supplied data
 */
function upsertMany(dataArray, collection) {
  return new Promise((resolve, reject) => {
    return Promise.all(
      dataArray.map(record => {
        if (!record._id) return reject(new Error(`Expect to find _id key in ${JSON.stringify(record)}`));
        return collection.updateOne(
          { _id: record._id },
          { $set: record },
          { upsert: true }
        );
      }))
      .then(() => resolve(dataArray))
      .catch(err => reject(err));
  });
}

module.exports = { upsertMany };
