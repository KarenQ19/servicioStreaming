import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 400,
  data?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};