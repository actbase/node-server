// @ts-ignore
import { DataType, TypeIsObject, ValueObjectDefault } from './contants/TypeIs';
import { ValueObject } from './lib/dto';

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
  socket?: SocketOption;
  listener?: () => void;
}

export interface AuthOption {
  jwt_secret: string;
  jwt_expiration: number;
  handler: () => AsyncFunction<string, any>;
}

export interface SocketOption {
  adapter?: unknown;
  listener?: (socket: unknown) => void;
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

export const parseType = (
  type: DataType | undefined,
  args?: unknown[],
): { isDto?: boolean; typeIs?: TypeIsObject; dto?: ValueObject } => {
  if (!type) return {};
  const dataType = 'function' === typeof type ? (args ? type(...args) : type()) : type;
  const isDto = typeof dataType === 'object' && '__dto_name' in dataType;
  return {
    isDto,
    typeIs: isDto ? undefined : <TypeIsObject>dataType,
    dto: isDto ? <ValueObject>dataType : undefined, //
  };
};
