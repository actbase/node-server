import swaggerUi from 'swagger-ui-express';
import { SwaggerOption } from '../types';
import express from 'express';
import { getDtoDefinitions, ValueObject } from './dto';
import { getPages, SwaggerData } from './route';
import { TypeIsObject } from '../contants/TypeIs';

const swagger = require('../../assets/swagger-data.json');

const methods = ['get', 'post', 'put', 'delete'];

const swaggerHandler = (app: express.Express, options: SwaggerOption, prefix?: string) => {
  const dto = getDtoDefinitions();
  Object.keys(dto).map(key => {
    swagger.components.schemas[key] = dto[key];
  });

  swagger.info.title = options.name;
  swagger.info.version = options.version;
  swagger.info.description = options.description;

  const pages = getPages();
  pages.sort((a: SwaggerData, b: SwaggerData) => {
    const ix1 = methods.indexOf(a.method.toLowerCase());
    const ix2 = methods.indexOf(b.method.toLowerCase());
    return (a.tags?.[0] || 0) > (b.tags?.[0] || 0)
      ? 1
      : (a.tags?.[0] || 0) < (b.tags?.[0] || 0)
      ? -1
      : a.path.path > b.path.path
      ? 1
      : a.path.path < b.path.path
      ? -1
      : ix1 > ix2
      ? 1
      : ix1 < ix2
      ? -1
      : 0;
  });

  pages.forEach((v: SwaggerData) => {
    if (!swagger.paths[v.path.path]) swagger.paths[v.path.path] = {};

    let resultData = undefined;

    if ((<ValueObject>v.response)?.__dto_name) {
      resultData = { $ref: '#/components/schemas/' + (<ValueObject>v.response)?.__dto_name };
    } else {
      // @ts-ignore
      const t1 = <TypeIsObject>v.response;
      // @ts-ignore
      const t2 = typeof t1 === 'function' ? t1() : t1;
      if (t2?.toSwagger) {
        resultData = t2.toSwagger();
      }
    }

    swagger.paths[v.path.path][v.method?.toLowerCase()] = {
      tags: v.tags,
      operationId: v.operationId,
      summary: v.summary,
      description: v.description,
      parameters: v.parameters,
      requestBody: v.requestBody,
      responses: {
        200: {
          description: 'OK',
          content: !resultData
            ? undefined
            : {
                'application/json': { schema: resultData },
              },
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

  // @ts-ignore
  app.use('/api-docs', (req: express.Request, res: express.Response) => {
    swagger.servers = [
      {
        url: `${options.scheme}://${options.host || req.headers.host}${prefix ? `/${prefix}` : ''}`,
      },
    ];
    return res.status(200).json(swagger);
  });
};

export default swaggerHandler;
