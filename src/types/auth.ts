import { Request } from 'express';
import { IUser } from './models.js';

// JWT Payload
export interface IJwtPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Auth Request types
export interface IAuthenticatedRequest extends Request {
  user?: IUser;
}

export interface IAuthRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest extends IAuthRequest {
  name: string;
}

export interface IForgotPasswordRequest {
  email: string;
}

export interface IResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Auth Response types
export interface IAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: IUser;
}

export interface ILoginResponse extends IAuthResponse {
  token: string;
  user: IUser;
}
