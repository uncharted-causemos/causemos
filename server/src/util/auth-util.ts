import type { Request, Response, NextFunction } from 'express';

const basicAuth = (user: string, pass: string): string => {
  return 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
};

export const getBasicAuthToken = (user: string, pass: string): string => {
  return basicAuth(user, pass);
};

export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const checkRole = (roles: string[]) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return [
    (req: Request, res: Response, next: NextFunction) => {
      if (!roles.length) {
        next();
      }

      const rolesInToken: string[] = req.auth?.realm_access?.roles || [];
      const roleIntersection = roles.filter((value) => rolesInToken.includes(value));
      if (!roleIntersection.length) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      next();
    },
  ];
};
