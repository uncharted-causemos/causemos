const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const PERMISSIONS = Object.freeze({
  USER: 'api:user',
  ADMIN: 'api:admin',
});

module.exports = {
  ROLES,
  PERMISSIONS,
};
