// import { DTOObject } from '../types';
import { TypeIsDefine } from '../contants/TypeIs';

// interface AppUser {
//   id?: number;
//   roles?: string[];
// }

export interface RequestParamObject {
  [key: string]: TypeIsDefine;
}

export interface RoutePath {
  path: string;
  items?: {
    [key: string]: TypeIsDefine;
  };
}

export interface RouteRequest {
  uri: string | RoutePath;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  roles?: string[];
  query?: RequestParamObject;
  body?: RequestParamObject;
  // outputDto?: DTOObject;
}

export interface RouteOption {
  tags?: string[];
  summary?: string;
  description?: string;
}

interface ExecuteArgs {
  path: { [key: string]: unknown };
  query: { [key: string]: unknown };
  body: { [key: string]: unknown };
  user: { [key: string]: unknown };
}

type ExecuteFunction =
  | ((args: ExecuteArgs) => Promise<unknown> | unknown)
  | ((req: any, res: any, next: any) => Promise<unknown> | unknown | void);

export const createRoute = (request: RouteRequest, execute: ExecuteFunction, options: RouteOption) => {
  console.log(request, execute, options);
};
