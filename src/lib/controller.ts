import {
  AsyncFunction,
  AuthOption,
  ControllerOption,
  ControllerRequest,
  DTOObject,
  PageData,
  RequestParamObject,
} from '../types';
import express, { NextFunction } from 'express';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { pick } from 'lodash';
import * as jwt from 'jsonwebtoken';
import { DataTypeOf } from '../contants/DataType';

interface AppUser {
  id?: number;
  roles?: string[];
}

interface ExecuteArgs {
  path: { [key: string]: unknown };
  query: { [key: string]: unknown };
  body: { [key: string]: unknown };
  user: { [key: string]: unknown };
}

type ExecuteType =
  | ((args: ExecuteArgs) => Promise<unknown | void>)
  | ((req: any, res: any, next: any) => Promise<unknown | void>)
  | ((args: ExecuteArgs) => unknown | void)
  | ((req: any, res: any, next: any) => unknown | void);

interface ConfigSpec {
  pages: {
    request: ControllerRequest;
    execute: ExecuteType;
    size: number;
    options: ControllerOption;
  }[];
  auth?: AuthOption;
}

const config: ConfigSpec = {
  pages: [],
};

export const createController = (request: ControllerRequest, execute: ExecuteType, options: ControllerOption) => {
  config.pages.push({
    request,
    execute,
    size: Object.keys(request?.params?.path || {}).length || 0,
    options,
  });
};

const fixParam = (
  _args: DTOObject | DTOObject[] | RequestParamObject | RequestParamObject[] | undefined,
  source: any,
) => {
  if (!source || !_args) return source;

  const item: DTOObject | RequestParamObject = Array.isArray(_args) ? _args?.[0] : _args;
  const args: RequestParamObject = <RequestParamObject>(item.__dto_name ? <RequestParamObject>item.properties : item);
  const items = pick(source, Object.keys(args));

  return Object.keys(items).reduce((p: { [key: string]: any }, v) => {
    if (items[v] === undefined || items[v] === null) {
      p[v] = undefined;
    } else if (args?.[v].type === 'number') {
      p[v] = parseInt(String(items[v]).replace(/[^0-9\.]+/, ''), 10);
    } else {
      p[v] = items[v];
    }
    return p;
  }, {});
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

export const parseArgs = function(object: { [key: string]: any }, args: string) {
  const output: { [key: string]: any } = {};
  Object.keys(object).forEach((key: string) => {
    let extraData = {};
    if (object[key].type[args]) {
      extraData = object[key].type[args];
    }
    output[key] = {
      ...object[key],
      ...extraData,
    };
  }, {});

  return output;
};

export const requestMapping: AsyncFunction<
  AuthOption,
  {
    router: any;
    pages: PageData[];
    definitions: any;
  }
> = async (options: AuthOption) => {
  config.auth = options;

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

  const pages: PageData[] = [];
  const definitions: { [key: string]: any } = {};

  const defineObject = (
    params: DTOObject | RequestParamObject | undefined,
    extra: { in: string; required?: boolean },
  ): any => {
    const _params = params?.__dto_name ? <RequestParamObject>params.properties : <RequestParamObject>params;
    return Object.keys(_params || {}).map(name => {
      const args: { [key: string]: any } = {
        type: _params[name].type,
        format: undefined,
        description: _params[name]?.description,
        example: _params[name]?.example,
        enum: undefined,
      };

      if (typeof _params[name].type !== 'string') {
        let o2 = undefined;
        if (typeof _params[name].type === 'function') {
          o2 = (<Function>_params[name].type)();
        } else {
          o2 = <DataTypeOf>_params[name].type;
        }
        args.type = o2?.swagger?.type;
        args.format = o2?.swagger?.format;
        args.example = o2?.swagger?.example;
        args.enum = o2?.swagger?.enum;
      }

      return {
        name,
        ...extra,
        ...args,
      };
    });
  };

  config.pages.sort((a, b) => (a.size > b.size ? 1 : a.size < b.size ? -1 : 0));
  for (const page of config.pages) {
    const { execute, options, request } = page;

    const path = request.uri;
    const method: string = request.method.toLowerCase() || 'get';

    const parameters = [];
    let consumes = ['application/json'];
    const requestBody = { content: {} };

    const pathObject = defineObject(request.params?.path, { in: 'path', required: true });
    if (pathObject) parameters.push(...pathObject);

    const queryObject = defineObject(request.params?.query, { in: 'query' });
    if (queryObject) parameters.push(...queryObject);

    let resultKey = '';
    if (request.outputDto) {
      resultKey = request.outputDto?.__dto_name;
      if (resultKey) {
        definitions[resultKey] = {
          type: 'object',
          properties: request.outputDto?.properties,
        };
      }
    }

    if (request.requestBody) {
      if (request.requestBody.type === 'formdata') {
        consumes[0] = 'multipart/form-data';
        if (request.requestBody.isArray) {
          // @ts-ignore
          requestBody.content['multipart/form-data'] = {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                // @ts-ignore
                properties: parseArgs(request.requestBody.properties, 'swagger'),
              },
            },
          };
        } else {
          // @ts-ignore
          requestBody.content['multipart/form-data'] = {
            schema: {
              type: 'object',
              // @ts-ignore
              properties: parseArgs(request.requestBody.properties, 'swagger'),
            },
          };
        }
      } else if (request.requestBody.type === 'json') {
        // @ts-ignore
        requestBody.content['application/json'] = {
          schema: {
            type: 'object',
            // @ts-ignore
            properties: parseArgs(request.requestBody.properties, 'swagger'),
          },
        };
      }
    }

    let security: { Bearer?: string[]; OAuthLogin?: string[] }[] = [];
    if (request.roles && request.roles.length > 0) {
      request.roles = request.roles.map(v => v?.toLowerCase?.());
      security = [
        {
          OAuthLogin: request.roles?.map(v => {
            return v?.indexOf(':') > 0 ? v.substring(0, v.indexOf(':')).toLowerCase() : v.toLowerCase();
          }),
        },
        {
          Bearer: [],
        },
      ];
    }

    pages.push({
      path,
      method,
      data: {
        tags: options.tags,
        summary: options.summary,
        security: security,
        description: options.description,
        operationId: request.method + ':' + request.uri,
        consumes,
        parameters,
        resultKey,
        requestBody,
      },
    });

    const route_uri = request.uri.replace(/\{([a-zA-Z0-9\_]+)\}/g, ':$1');

    const handlePrepare = (req: express.Request, res: express.Response, next: NextFunction) => {
      req.user = undefined;
      try {
        const fn = passport.authenticate('jwt', { session: false }, async (err, user) => {
          console.log('authenticate', err, user);
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
          // @ts-ignore
          const user: AppUser = req.user;
          console.log('execute..');

          const args = {
            params: {
              ...req.params,
              ...req.body,
              ...req.query,
            },
            files: req.files,
            query: fixParam(request.params?.query, req.query),
            path: fixParam(request.params?.path, req.params),
            body: req?.body,
            user: user,
          };

          if (request.roles && request.roles.length > 0 && !request.roles.includes('any')) {
            const user_roles = user?.roles?.map(v => v.toLowerCase()) || [];
            let success = false;
            for (const sec of request.roles) {
              if (sec.indexOf(':') >= 0) {
                const cmd = sec.substring(sec.indexOf(':') + 1);
                const validate = Function('params', 'user', `return (${cmd})`);

                const result = validate(args.params, req.user);
                if (result) {
                  success = true;
                  break;
                }
              } else if (user_roles.includes(sec?.toLowerCase())) {
                success = true;
              }
            }

            console.log(user_roles, request.roles);

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
            // @ts-ignore
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

  return { router, pages, definitions };
};
