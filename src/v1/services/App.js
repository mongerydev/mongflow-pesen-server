const _getApp = (client) => {
  return client.query('SELECT * FROM "app"');
};



module.exports = {
_getApp
}