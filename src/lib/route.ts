// import { DTOObject } from '../types';
import { TypeIs, TypeIsDefine } from '../contants/TypeIs';
import { ValueObject } from './dto';
import { AuthOption, ControllerOption } from '../types';

// interface AppUser {
//   id?: number;
//   roles?: string[];
// }

export interface RequestParam {
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
  query?: RequestParam | ValueObject;
  body?: RequestParam | ValueObject;
  response?: ValueObject;
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

interface ConfigSpec {
  pages: {
    request?: RouteRequest;
    execute: ExecuteFunction;
    size: number;
    options: ControllerOption;
  }[];
  auth?: AuthOption;
}

const config: ConfigSpec = {
  pages: [],
};

const uriRegex = /\{([a-zA-Z0-9\_]+)\}/g;

export const createRoute = (request: RouteRequest, execute: ExecuteFunction, options: RouteOption) => {
  const path = typeof request.uri === 'string' ? { path: request.uri } : request.uri;
  path.path.match(uriRegex)?.forEach(text => {
    const str = text.substring(1, text.length - 1);
    if (!path.items) path.items = {};
    if (!path.items[str]) {
      path.items[str] = {
        type: TypeIs.STRING,
      };
    }
  });

  config.pages.push({
    request: {
      ...request,
      uri: path,
    },
    execute,
    size: Object.keys(path?.items || {}).length || 0,
    options,
  });
};

export const getSwaggerData = () => {
  const definitions: { [key: string]: any } = {};

  console.log(definitions);
};
