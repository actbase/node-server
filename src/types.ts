import { DataTypeOf } from './contants/DataType';
import { FindAndCountOptions } from 'sequelize/types/lib/model';

// @ts-ignore
export type AsyncFunction<A, O> = (args: A) => Promise<O>;

export interface DTOObject {
  __dto_name: string;
  properties: RequestParamObject;
  map: (o: any) => any;
  collect: (o: any[]) => any[];
  middleware: (options: any, user: any, fields: string | undefined) => FindAndCountOptions;
}

export interface PageData {
  path: string;
  method: string;
  data?: {
    tags?: string[];
    summary?: string;
    security?: any;
    description?: string;
    operationId?: string;
    consumes?: string[];
    parameters: any;
    resultKey?: string;
    requestBody?: any;
  };
}

export interface ServerOption {
  port: number;
  prefix?: string;
  auth: AuthOption;
  database: DatabaseOption;
  swagger: SwaggerOption;
}

export interface AuthOption {
  jwt_secret: string;
  jwt_expiration: number;
  handler: AsyncFunction<string, any>;
}

export interface SwaggerOption {
  name: string;
  version: string;
  description: string;
  scheme: 'http' | 'https';
  host: string;
}

export interface DatabaseOption {
  debug?: boolean;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql';
  host: string;
  port: number;
  scheme: string;
  username: string;
  password: string;
}

export interface RequestParam {
  type: 'string' | 'number' | 'array' | 'object' | DataTypeOf | (() => DataTypeOf);
  description?: string;
  example?: string;
  enum?: string[];
}

export interface RequestParamObject {
  [key: string]: RequestParam;
}

export interface ControllerRequest {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  roles?: string[];
  params?: {
    path?: DTOObject | RequestParamObject;
    query?: DTOObject | RequestParamObject;
  };
  requestBody?: {
    type?: 'formdata' | 'json';
    isArray?: boolean;
    properties?: RequestParamObject;
  };
  outputDto?: DTOObject;
}

export interface ControllerOption {
  tags?: string[];
  summary?: string;
  description?: string;
}
