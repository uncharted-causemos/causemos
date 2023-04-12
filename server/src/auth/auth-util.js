const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const PERMISSIONS = Object.freeze({
  USER: 'realm:user',
  ADMIN: 'realm:admin',
});

module.exports = {
  ROLES,
  PERMISSIONS,
};
