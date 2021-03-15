import { AsyncFunction, AsyncFunctions, AuthOption, ControllerOption, ControllerRequest, PageData } from '../types';
import express, { NextFunction } from 'express';
import passport from 'passport';
import { pick } from 'lodash';
import md5 from 'crypto-js/md5';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';

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
}

const config: ConfigSpec = {
  pages: [],
};

export const createController = (
  request: ControllerRequest,
  execute: AsyncFunction<any, any> | AsyncFunctions<[any, any, any, any], any>,
  options: ControllerOption,
) => {
  config.pages.push({
    request,
    execute,
    size: Object.keys(request?.params?.path || {}).length || 0,
    options,
  });
};

const fixParam = (args: any, source: any) => {
  if (!source || !args) return source;
  const items = pick(source, Object.keys(args));
  return Object.keys(items).reduce((p: { [key: string]: any }, v) => {
    if (items[v] === undefined || items[v] === null) {
      p[v] = undefined;
    } else if (args[v].type === 'number') {
      p[v] = parseInt(String(items[v]).replace(/[^0-9\.]+/, ''), 10);
    } else {
      p[v] = items[v];
    }
    return p;
  }, {});
};

export const requestMapping: AsyncFunction<
  AuthOption,
  {
    router: any;
    pages: PageData[];
    definitions: any;
  }
> = async (options: AuthOption) => {
  const jwt_config = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: options.jwt_secret,
  };

  passport.use(
    'jwt',
    new JwtStrategy(jwt_config, async (jwtPayload, done) => {
      try {
        done(null, options.handler?.(jwtPayload));
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

  config.pages.sort((a, b) => (a.size > b.size ? 1 : a.size < b.size ? -1 : 0));
  for (const page of config.pages) {
    const { execute, options, request } = page;

    const path = request.uri;
    const method: string = request.method.toLowerCase() || 'get';

    const parameters = [];
    let consumes = ['application/json'];

    Object.keys(request.params?.path || {}).forEach(key => {
      parameters.push({
        name: key,
        in: 'path',
        required: true,
        ...request.params?.path?.[key],
      });
    });

    Object.keys(request.params?.query || {}).forEach(key => {
      parameters.push({
        name: key,
        in: 'query',
        ...request.params?.path?.[key],
        ...request.params?.query?.[key],
      });
    });

    if (Object.keys(request.params?.form || {}).length > 0) {
      consumes[0] = 'multipart/form-data';
      Object.keys(request.params?.form || {}).forEach(key => {
        parameters.push({
          name: key,
          in: 'formData',
          ...request.params?.form?.[key],
        });
      });
    } else if (Array.isArray(request.params?.body) && (request.params?.body?.length || 0) > 0) {
      const key = md5(JSON.stringify(request.params?.body)).toString();
      definitions[key] = {
        type: 'array',
        items: {
          type: 'object',
          properties: request.params?.body[0],
        },
      };

      parameters.push({
        name: 'body',
        in: 'body',
        schema: {
          $ref: '#/definitions/' + key,
        },
        // items: {
        //   type: 'object',
        //   // properties: params.body,
        // },
      });
    } else if (Object.keys(request.params?.body || {}).length > 0) {
      const key = md5(JSON.stringify(request.params?.body)).toString();
      definitions[key] = {
        type: 'object',
        properties: request.params?.body,
      };

      parameters.push({
        name: 'body',
        in: 'body',
        schema: {
          $ref: '#/definitions/' + key,
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
        next();
      }
    };

    const handleExecute = async (req: express.Request, res: express.Response, next: NextFunction) => {
      if (!execute) {
        res.status(404).json({});
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
    router.use((_req, res) => {
      res.type('text/plain');
      res.status(404);
      res.send('404 - Not Found');
    });
  }

  return { router, pages, definitions };
};
