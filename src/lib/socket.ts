import { AuthOption, SocketOption } from '../types';
import { RoutePath } from './route';
import { Server } from 'http';

interface ConfigSpec {
  container?: any;
  listeners: any[];
}

interface AppUser extends Express.User {
  id?: number;
  roles?: string[];
}

export interface RouteRequest {
  uri: string | RoutePath;
  roles?: string[];
}

interface ExecuteArgs {
  path?: { [key: string]: unknown };
  body?: { [key: string]: unknown };
  user?: AppUser;
}

type ExecuteFunction = ((args: ExecuteArgs) => Promise<unknown> | unknown) &
  ((req: any, res: any, next: any) => Promise<unknown> | unknown | void);

const config: ConfigSpec = {
  container: undefined,
  listeners: [],
};

export const createSocket = (request: RouteRequest, execute: ExecuteFunction): any => {
  config.listeners.push({
    request,
    execute,
  });
};

export const socketInit = (server: Server, options: SocketOption, authOption?: AuthOption) => {
  if (config.container) return;

  const io = require('socket.io')(server);
  if (options.adapter) {
    io.adapter(options.adapter);
  }
  if (authOption) {
    const auth = authOption;
    if (authOption.jwt_secret && authOption.handler) {
      const jwtAuth = require('socketio-jwt-auth');
      const handler = auth.handler();
      const jwtHandler = jwtAuth.authenticate({ secret: auth.jwt_secret, algorithm: 'HS256' }, async function(
        payload: any,
        done: any,
      ) {
        try {
          const user = await handler(payload);
          if (user) {
            return done(null, user);
          } else {
            return done();
          }
        } catch (e) {
          return done(e);
        }
      });
      io.use(jwtHandler);
    }
  }

  io.on('connection', (socket: any) => {
    const user: AppUser = <AppUser>socket.request.user;
    if (authOption) {
      console.log('Authentication passed!', user?.id);
      // now you can access user info through socket.request.user
      // socket.request.user.logged_in will be set to true if the user was authenticated
      socket.emit('success', {
        message: 'success logged in!',
        user: socket.request.user,
      });
    }

    config.listeners.map((item: any) => {
      const r = item.request.roles?.filter((v: string) => user?.roles?.includes(v));
      if (r?.length > 0 || item.request.roles === undefined) {
        socket.on(item.request.path, async (body: any) => {
          await item.execute(socket, { body, user });
        });
      }
    });
  });

  config.container = io;
  return io;
};

export const getSocketIO = (): any | undefined => {
  return config.container;
};

export const socketSendTo = (to: string, event: string, data: any) => {
  return config.container?.to(to).emit(event, data);
};

export const socketSendAll = (event: string, data: any) => {
  return config.container?.emit(event, data);
};
