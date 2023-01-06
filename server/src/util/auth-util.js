const basicAuth = (user, pass) => {
  return 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
};

const getBasicAuthToken = (user, pass) => {
  return basicAuth(user, pass);
};

module.exports = {
  getBasicAuthToken,
};
