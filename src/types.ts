// @ts-ignore
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

export interface ControllerOption {
  tags?: string[];
  summary?: string;
  description?: string;
}
