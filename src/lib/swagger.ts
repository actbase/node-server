import swaggerUi from 'swagger-ui-express';
import { PageData, SwaggerOption } from '../types';
import express from 'express';

// eslint-disable-next-line no-undef
const swagger = require('../../assets/swagger-data.json');

const methods = ['get', 'post', 'put', 'delete'];
// @ts-ignore
const swaggerHandler = (app: express, options: SwaggerOption, { pages, definitions }) => {
  swagger.definitions = definitions;
  swagger.info.title = options.name;
  swagger.info.version = options.version;
  swagger.info.description = options.description;

  pages.sort((a: PageData, b: PageData) => {
    const ix1 = methods.indexOf(a.method);
    const ix2 = methods.indexOf(b.method);
    return (a.data?.tags?.[0] || 0) > (b.data?.tags?.[0] || 0)
      ? 1
      : (a.data?.tags?.[0] || 0) < (b.data?.tags?.[0] || 0)
      ? -1
      : a.path > b.path
      ? 1
      : a.path < b.path
      ? -1
      : ix1 > ix2
      ? 1
      : ix1 < ix2
      ? -1
      : 0;
  });

  pages.forEach((v: PageData) => {
    if (!v.data?.tags || !v.data?.summary) return;

    if (!swagger.paths[v.path]) swagger.paths[v.path] = {};
    swagger.paths[v.path][v.method] = {
      tags: ['No named'],
      ...v.data,
      responses: {
        200: {
          description: 'OK',
          content: 'application/json',
          schema: v.data?.resultKey
            ? {
                $ref: '#/definitions/' + v.data?.resultKey,
              }
            : undefined,
        },
        400: {
          description: 'Bad Request',
          content: 'application/json',
        },
        401: {
          description: 'Unauthorized',
          content: 'application/json',
        },
        403: {
          description: 'Forbidden',
          content: 'application/json',
        },
        404: {
          description: 'Not Found',
        },
      },
    };
  });

  app.use(
    '/swagger-ui.html',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: `${options.scheme}://${options.host}/api-docs`,
        docExpansion: 'none',
      },
    }),
  );

  app.use('/api-docs', (req: express.Request, res: express.Response) => {
    swagger.host = options.host || req.headers.host;
    swagger.schemes = [options.scheme];
    return res.status(200).json(swagger);
  });
};

export default swaggerHandler;
