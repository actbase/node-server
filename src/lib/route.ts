import { TypeIs, TypeIsDefine } from '../contants/TypeIs';
import { ValueObject } from './dto';
import { AuthOption, ControllerOption, parseType } from '../types';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import passport from 'passport';
import express, { NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

interface AppUser extends Express.User {
  id?: number;
  roles?: string[];
}

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
  formdata?: boolean;
  response?: ValueObject | (() => ValueObject) | TypeIsDefine | (() => TypeIsDefine);
}

export interface RouteOption {
  tags?: string[];
  summary?: string;
  description?: string;
  paging?: 'sort' | 'page' | true | false;
}

interface ExecuteArgs {
  path?: { [key: string]: unknown };
  query: { [key: string]: unknown };
  body: { [key: string]: unknown };
  files?: { [key: string]: unknown };
  user?: AppUser;
}

type ExecuteFunction = ((args: ExecuteArgs) => Promise<unknown> | unknown) &
  ((req: any, res: any, next: any) => Promise<unknown> | unknown | void);

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
        const t2 = typeof t1 === 'object' && 'toSwagger' in t1 ? t1?.toSwagger() : t1;
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
        const t2 = !(typeof t1 === 'object' && 'toSwagger' in t1) || typeof t1 === 'string' ? t1 : t1?.toSwagger();
        parameters.push({
          name,
          ...t2,
          in: 'query',
          description: request.query?.[name].comment,
        });
      });
    }

    if (options.paging) {
      parameters.push({
        name: 'page',
        ...TypeIs.INT().toSwagger(),
        in: 'query',
        description: '표시할 Page',
        example: 0,
      });

      parameters.push({
        name: 'limit',
        ...TypeIs.INT().toSwagger(),
        in: 'query',
        description: '한 페이지당 표시 갯수',
        example: 20,
      });

      if ([true, 'sort'].includes(options.paging)) {
        parameters.push({
          name: 'sort',
          ...TypeIs.STRING().toSwagger(),
          in: 'query',
          description: '정렬필드',
        });

        parameters.push({
          name: 'dir',
          ...TypeIs.ENUM('desc', 'asc').toSwagger(),
          in: 'query',
          description: '정렬방식',
        });
      }
    }

    const requestBodyJson = {};
    if (request.body) {
      Object.keys(<RequestParam>request.body).forEach(key => {
        const pref = (<RequestParam>request.body)?.[key];
        const type = typeof pref?.type === 'function' ? pref?.type() : pref?.type;
        if ('toSwagger' in type) {
          // @ts-ignore
          requestBodyJson[key] = {
            ...type?.toSwagger(),
            description: pref?.comment,
          };
        }
      });
    }

    const response = typeof request.response === 'function' ? request.response() : request.response;

    let requestBody = undefined;
    if (Object.keys(requestBodyJson || {}).length) {
      const label = request.formdata ? 'multipart/form-data' : 'application/json';
      requestBody = {
        content: {
          [label]: {
            schema: {
              type: 'object',
              properties: requestBodyJson,
            },
          },
        },
      };
    }

    config.swaggers.push({
      operationId: request.method + ':' + path.path,
      path,
      method: request.method,
      tags: options.tags,
      summary: options.summary,
      description: options.description,
      requestBody,
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

  return {};
};

export const getJwtToken = async (req: express.Request, user: object, refreshPayload: object) => {
  return new Promise((resolve, reject) => {
    req.login(user, { session: false }, err => {
      if (err) {
        reject(err);
        return;
      }
      const expires_in = config.auth?.jwt_expiration || -1;
      const options = {
        expiresIn: (expires_in || 0) > 0 ? expires_in : '30d',
      };

      const access_token = jwt.sign(user, config.auth?.jwt_secret || 'defkey', options);
      const refresh_token = jwt.sign(refreshPayload, config.auth?.jwt_secret || 'defkey');

      resolve({
        access_token,
        expires_in,
        refresh_token,
        token_type: 'bearer',
      });
    });
  });
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
    const { execute, request } = page;

    let route_uri = String('object' === typeof request?.uri ? request?.uri.path : request?.uri);
    route_uri = route_uri.replace(/\{([a-zA-Z0-9\_]+)\}/g, ':$1');

    const method: string = request?.method?.toLowerCase() || 'get';

    const handlePrepare = (req: express.Request, res: express.Response, next: NextFunction) => {
      req.user = undefined;
      try {
        const fn = passport.authenticate('jwt', { session: false }, async (err, user) => {
          req.user = undefined;
          if (!err) req.user = user || undefined;
          next();
        });
        fn(req, res, next);
      } catch (e) {
        console.warn(e);
        next();
      }
    };

    const handleExecute = async (req: express.Request, res: express.Response, next: NextFunction) => {
      if (!execute) {
        res.status(404).json({ message: 'not define execute..' });
      } else {
        try {
          const user: AppUser = <AppUser>req.user;
          if (user?.roles && typeof user.roles === 'string') {
            user.roles = JSON.parse(user.roles);
          }
          const args: ExecuteArgs = {
            files: req.files,
            query: {},
            path: req.params,
            body: {},
            user,
          };

          const queryFields = request?.query;
          for (const key of Object.keys(req?.query)) {
            const field = (<RequestParam>queryFields)[key];
            const tp = parseType(field?.type);
            if (tp.isDto) {
              args.query[key] = tp.dto?.map(req.body?.[key]);
            } else if (tp.typeIs) {
              args.query[key] = tp.typeIs?.fixValue ? tp.typeIs.fixValue(req.body?.[key]) : req.body?.[key];
            }
          }

          const bodyFields = !!request?.body?.__dto_name ? request.body.properties : request?.body;
          for (const key of Object.keys(req?.body)) {
            const field = (<RequestParam>bodyFields)[key];
            const tp = parseType(field?.type);
            if (tp.isDto) {
              args.body[key] = tp.dto?.map(req.body?.[key]);
            } else if (tp.typeIs) {
              args.body[key] = tp.typeIs?.fixValue ? tp.typeIs.fixValue(req.body?.[key]) : req.body?.[key];
            }
          }

          if (request?.roles && request.roles.length > 0 && !request.roles.includes('any')) {
            const user_roles = user?.roles?.map(v => v.toLowerCase()) || [];
            let success = false;
            for (const sec of request.roles) {
              if (sec.indexOf(':') >= 0) {
                const cmd = sec.substring(sec.indexOf(':') + 1);
                const validate = Function('params', 'user', `return (${cmd})`);

                const result = validate({ ...args.path, ...args.query }, req.user);
                if (result) {
                  success = true;
                  break;
                }
              } else if (user_roles.includes(sec?.toLowerCase())) {
                success = true;
              }
            }

            if (!success) {
              throw {
                status: 401,
                message: 'Required Permissions..',
                data: request.roles,
              };
            }
          }

          if (execute.length >= 3) {
            return await execute(req, res, next);
          } else {
            const output = await execute(args); //{ ...args, user: req.user });
            res.status(200).json(output);
          }
        } catch (e) {
          if (e?.status === 301) {
            res.redirect(301, e.location);
          } else if (e?.status) {
            res.status(e?.status).json({ message: e?.message, data: e?.data });
          } else {
            if (!e?.status) {
              console.warn('>>> ', route_uri);
              console.warn(e);
            }
            res
              .status(e?.status || 500)
              .json({ uri: route_uri, message: e?.message, data: e?.data || JSON.stringify(e) });
          }
        }
      }
    };

    if (method === 'post') {
      router.post(route_uri, handlePrepare, handleExecute);
    } else if (method === 'put') {
      router.put(route_uri, handlePrepare, handleExecute);
    } else if (method === 'delete') {
      router.delete(route_uri, handlePrepare, handleExecute);
    } else if (method === 'get') {
      router.get(route_uri, handlePrepare, handleExecute);
    } else {
      router.all(route_uri, handlePrepare, handleExecute);
    }
  }

  // 커스텀 404 페이지
  router.use((_req, res) => {
    res.type('text/plain');
    res.status(404);
    res.send('404 - Not Found');
  });

  return router;
};
