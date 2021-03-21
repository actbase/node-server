import {
  AsyncFunction,
  AsyncFunctions,
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

// @ts-ignore

interface AppUser {
  id?: number;
  roles?: string[];
}

interface ConfigSpec {
  pages: {
    request: ControllerRequest;
    execute: AsyncFunction<any, any> | AsyncFunctions<[any, any, any, any], any>;
    size: number;
    options: ControllerOption;
  }[];
  auth?: AuthOption;
}

const config: ConfigSpec = {
  pages: [],
};

export const createController = (
  request: ControllerRequest,
  execute:
    | AsyncFunction<
        { path?: { [key: string]: any }; body?: { [key: string]: any }; form?: { [key: string]: any }; user?: AppUser },
        any
      >
    | AsyncFunctions<[express.Request, express.Response, NextFunction, any], any>,
  options: ControllerOption,
) => {
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

export const getJwtToken = async (req: express.Request, res: express.Response, user: object) => {
  req.login(user, { session: false }, err => {
    if (err) {
      res.send(err);
    }
    // const expires_in = parseInt(CONFIG.jwt_expiration);
    //, { expiresIn: expires_in }
    const access_token = jwt.sign(user, config.auth?.jwt_secret || 'defkey');
    const refresh_token = jwt.sign({ ...req.body }, config.auth?.jwt_secret || 'defkey');

    return res.json({
      access_token,
      // expires_in,
      refresh_token,
      token_type: 'bearer',
    });
  });
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
    if (params?.__dto_name) {
      const _params = <RequestParamObject>params.properties;
      return Object.keys(_params || {}).map(name => ({
        name,
        ...extra,
        ..._params[name],
      }));
    } else {
      const _params = <RequestParamObject>params;
      return Object.keys(_params || {}).map(name => ({
        name,
        ...extra,
        ..._params[name],
      }));
    }
  };

  config.pages.sort((a, b) => (a.size > b.size ? 1 : a.size < b.size ? -1 : 0));
  for (const page of config.pages) {
    const { execute, options, request } = page;

    const path = request.uri;
    const method: string = request.method.toLowerCase() || 'get';

    const parameters = [];
    let consumes = ['application/json'];

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

    if (Object.keys(request.params?.form || {}).length > 0) {
      consumes[0] = 'multipart/form-data';

      const formObject = defineObject(request.params?.form, { in: 'formData' });
      if (formObject) parameters.push(...formObject);
    } else if (request.params?.body && Object.keys(request.params?.body)?.length) {
      const is_array = Array.isArray(request.params?.body);
      const obj_field = is_array ? (<object[]>request.params?.body)?.[0] : request.params?.body;

      let definition_key = String((<DTOObject>obj_field)?.__dto_name) || '';
      if (definition_key) {
        definitions[definition_key] = {
          type: 'object',
          properties: (<DTOObject>obj_field)?.properties,
        };
      } else {
        definition_key = `미지정 (${Object.keys(definitions).length})`;
        definitions[definition_key] = is_array
          ? {
              type: 'array',
              items: {
                type: 'object',
                properties: obj_field,
              },
            }
          : {
              type: 'object',
              properties: obj_field,
            };
      }

      parameters.push({
        name: 'body',
        in: 'body',
        schema: {
          $ref: '#/definitions/' + definition_key,
        },
      });
    }

    let security: { user_auth: string[] }[] = [];
    if (request.roles && request.roles.length > 0) {
      request.roles = request.roles.map(v => v?.toLowerCase?.());
      security = [
        {
          user_auth: request.roles?.map(v => {
            return v?.indexOf(':') > 0 ? v.substring(0, v.indexOf(':')).toLowerCase() : v.toLowerCase();
          }),
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
      },
    });

    const route_uri = request.uri.replace(/\{([a-zA-Z0-9\_]+)\}/g, ':$1');

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
          // @ts-ignore
          const user: AppUser = req.user;

          const args = {
            params: {
              ...req.params,
              ...req.body,
              ...req.query,
            },
            files: req.files,
            body: fixParam(request.params?.body, req?.body),
            query: fixParam(request.params?.query, req.query),
            path: fixParam(request.params?.path, req.params),
            user: user,
          };

          const params = args.params;
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
              } else if (user_roles.includes(sec)) {
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
            console.log(execute);
            return await execute(req, res, next, { params });
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
      console.log(route_uri);
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

    //커스텀 404 페이지
    // router.use((_req, res) => {
    //   res.type('text/plain');
    //   res.status(404);
    //   res.send('404 - Not Found');
    // });
  }

  return { router, pages, definitions };
};
