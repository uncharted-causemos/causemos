const basicAuth = (user, pass) => {
  return 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
};

const getBasicAuthToken = (user, pass) => {
  return basicAuth(user, pass);
};

const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const PERMISSIONS = Object.freeze({
  USER: 'api:user',
  ADMIN: 'api:admin',
});

module.exports = {
  getBasicAuthToken,
  ROLES,
  PERMISSIONS,
};
