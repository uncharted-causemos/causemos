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

const checkRole = (roles) => {
  // roles param can be a single role string (e.g. ROLES.USER or 'user')
  // or an array of roles (e.g. [ROLES.ADMIN, ROLES.USER] or ['admin', 'user'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return [
    // authorize based on role
    (req, res, next) => {
      // no need to perform role verification
      if (!roles.length) {
        next();
      }

      const rolesInToken = req.auth.realm_access?.roles || [];
      const roleIntersection = roles.filter((value) => rolesInToken.includes(value));
      if (!roleIntersection.length) {
        // role is not authorized
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // authentication and authorization successful
      next();
    },
  ];
};

module.exports = {
  getBasicAuthToken,
  ROLES,
  checkRole,
};
