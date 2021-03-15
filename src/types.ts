// @ts-ignore
export type AsyncFunctions<A, O> = (...args: A) => Promise<O>;
export type AsyncFunction<A, O> = (args: A) => Promise<O>;

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
  };
}

export interface ServerOption {
  port: number;
  database: DatabaseOption;
  auth: AuthOption;
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
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'mariadb';
  host: string;
  port: number;
  scheme: string;
  username: string;
  password: string;
}

export interface RequestParam {
  type: 'string' | 'number';
  description?: string;
  example?: string;
  enum?: string[];
}

export interface ControllerRequest {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  roles?: string[];
  params?: {
    path?: {
      [key: string]: RequestParam;
    };
    body?: {
      [key: string]: RequestParam;
    };
    query?: {
      [key: string]: RequestParam;
    };
    form?: {
      [key: string]: RequestParam;
    };
  };
}

export interface ControllerOption {
  tags?: string[];
  summary?: string;
  description?: string;
}
