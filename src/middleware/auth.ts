import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { IAuthenticatedRequest, IJwtPayload } from '../types/auth.js';

export const protect = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    let token: string | undefined;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user?.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

export const optionalAuth = async (req: IAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IJwtPayload;
      req.user = await User.findById(decoded.id).select('-password') as any;
    }
  } catch (e) {
    // Continue without user
  }
  next();
};
