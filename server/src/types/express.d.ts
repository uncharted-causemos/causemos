declare namespace Express {
  interface Request {
    auth?: Record<string, any>;
  }
}
