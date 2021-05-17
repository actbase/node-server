// import { DTOObject } from '../types';
import { TypeIs, TypeIsDefine } from '../contants/TypeIs';
import { ValueObject } from './dto';
import { AuthOption, ControllerOption } from '../types';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import passport from 'passport';
import express from 'express';

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
  query?: RequestParam;
  body?: RequestParam | ValueObject;
  response?: ValueObject | (() => ValueObject) | TypeIsDefine | (() => TypeIsDefine);
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
  swaggers: SwaggerData[];
  auth?: AuthOption;
}

export interface SwaggerData {
  operationId: string;
  path: RoutePath;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: { [key: string]: any };
  response?: ValueObject | TypeIsDefine;
  data?: any;
}

const config: ConfigSpec = {
  pages: [],
  swaggers: [],
};

export function getPages() {
  return config.swaggers;
}

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

  if (options.tags?.length && options.summary) {
    const parameters: any[] = [];

    if (path.items) {
      Object.keys(path.items).forEach(name => {
        const t = path.items?.[name].type;
        const t1 = typeof t === 'function' ? t() : t;
        const t2 = typeof t1 === 'object' ? t1?.toSwagger() : t1;
        parameters.push({
          name,
          ...t2,
          in: 'path',
          required: true,
          description: path.items?.[name].comment,
        });
      });
    }

    if (request.query) {
      Object.keys(request.query).forEach(name => {
        const t = request.query?.[name].type;
        const t1 = typeof t === 'function' ? t() : t;
        const t2 = typeof t1 === 'string' ? t1 : t1?.toSwagger();
        parameters.push({
          name,
          ...t2,
          in: 'query',
          description: request.query?.[name].comment,
        });
      });
    }

    const requestBodyJson = {};
    if (request.body) {
      Object.keys(<RequestParam>request.body).forEach(key => {
        const pref = (<RequestParam>request.body)?.[key];
        const type = typeof pref?.type === 'function' ? pref?.type() : pref?.type;

        // @ts-ignore
        requestBodyJson[key] = {
          ...type?.toSwagger(),
          description: pref?.comment,
        };
      });
    }

    const response = typeof request.response === 'function' ? request.response() : request.response;
    config.swaggers.push({
      operationId: request.method + ':' + request.uri,
      path,
      method: request.method,
      tags: options.tags,
      summary: options.summary,
      description: options.description,
      requestBody: {
        content: {
          'application/json': !requestBodyJson
            ? undefined
            : {
                schema: {
                  type: 'object',
                  properties: requestBodyJson,
                },
              },
        },
      },
      parameters,
      response,
      data: {
        // security: security,
        // consumes,
        // parameters,
        // resultKey,
        // requestBody,
      },
    });
  }
};

export const installRoutes = async (options: AuthOption) => {
  config.auth = options;
  if (options) {
    const jwt_config = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: options.jwt_secret,
    };

    passport.use(
      'jwt',
      new JwtStrategy(jwt_config, async (jwtPayload, done) => {
        try {
          done(null, await options.handler?.(jwtPayload));
        } catch (e) {
          done(e);
        }
      }),
    );
  }

  const router = express.Router();
  router.use(function(_req, res, next) {
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });

  router.all('/*', function(_req, res, next) {
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    next();
  });

  config.pages.sort((a, b) => (a.size > b.size ? 1 : a.size < b.size ? -1 : 0));
  for (const page of config.pages) {
    console.log(page);
  }

  // 커스텀 404 페이지
  router.use((_req, res) => {
    res.type('text/plain');
    res.status(404);
    res.send('404 - Not Found');
  });

  return router;
};
