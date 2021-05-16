import fs from 'fs';
import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import passport from 'passport';
import http from 'http';
import { ServerOption } from './types';
import { dbAssociate, dbInit } from './lib/database';
import { requestMapping } from './lib/controller';
import swaggerHandler from './lib/swagger';

export const run = (dirname: string, options: ServerOption) => {
  const loadPath = async (path: string, subPath: string) => {
    const files = await fs.readdirSync(path + subPath, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        await loadPath(path, subPath + '/' + file.name);
      } else if (file.name.match(/\.js$/) !== null) {
        // eslint-disable-next-line no-undef
        require(dirname + '/app' + subPath + '/' + file.name);
      }
    }
  };

  const initServer = async () => {
    const dbContainer = await dbInit(options.database);
    await loadPath(dirname + '/app', '');

    await dbAssociate();
    const controllers = await requestMapping(options.auth);

    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '500mb' }));
    app.use(express.urlencoded({ limit: '500mb', extended: false }));
    app.use(
      passport.initialize({
        userProperty: '',
      }),
    );
    app.use(fileUpload({}));

    app.use(function(_req, res, next) {
      res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
      res.header('Access-Control-Allow-Origin', '*');
      next();
    });

    app.use('/v1', controllers.router);

    swaggerHandler(app, options.swagger, controllers.pages, controllers.definitions);

    if (dbContainer) {
      //   app.use('/sync', async (req, res) => {
      //     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      //     if (['::1', 'localhost', '127.0.0.1', '::ffff:127.0.0.1'].includes(<string>ip)) {
      //       await dbContainer.sync({ alter: { drop: false } });
      //
      //       res.type('text/plain');
      //       res.status(200);
      //       res.send('db-sync');
      //     } else {
      //       res.type('text/plain');
      //       res.status(404);
      //       res.send('404 - Not Found');
      //     }
      //   });
    }

    app.use('/', (_req, res) => {
      res.type('text/plain');
      res.status(200);
      res.send('chadu-serv');
    });

    app.use((_req, res) => {
      res.type('text/plain');
      res.status(404);
      res.send('404 - Not Found');
    });

    return { app };
  };

  initServer()
    .then(({ app }) => {
      const server = http.createServer(app);
      const port = options.port || 3100;
      server.listen(port, () => {
        console.log(`Server is running on ${port} port.  http://localhost:${port}`);
      });
    })
    .catch(console.warn);
};

export default run;
