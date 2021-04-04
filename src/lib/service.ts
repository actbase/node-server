import { AsyncFunctions, DTOObject } from '../types';
import { getSequelize } from './database';
import { FindAndCountOptions, Model, ModelCtor } from 'sequelize/types/lib/model';

export type RepoFn = {
  findAll: (model: ModelCtor<Model>, args: any) => Promise<any>;
  findOne: (model: ModelCtor<Model>, args: any) => Promise<any>;
  findAndCountAll: (model: ModelCtor<Model>, args: any) => Promise<any>;
  count: (model: ModelCtor<Model>, args: any) => Promise<any>;
  create: (model: ModelCtor<Model>, args: any) => Promise<any>;
  getObjects: (model: ModelCtor<Model>, args: GetObjectArgs) => Promise<any>;
};

export type ServiceMethodItem = AsyncFunctions<[RepoFn, object], void>;

export type ServiceMethod<T> = {
  [P in keyof T]: ServiceMethodItem;
};

export type RunningMethod<T> = {
  [P in keyof T]: AsyncFunctions<any, void>;
};

export interface PageRequest {
  page: number;
  limit: number;
  sort: string;
  dir: string;
}

export const pagingRequestParse = (
  params: { page?: any; limit?: any; sort?: any; dir?: any } | undefined,
): PageRequest => {
  const page = parseInt(params?.page || '0');
  const limit = parseInt(params?.limit || '30');
  const sort = params?.sort || 'created_at';
  const dir = params?.dir || 'desc';

  return { page, limit, sort, dir };
};

export const pagingResponseParse = (
  request: PageRequest,
  pageObject: { rows: any[]; count: number },
  fn: ((o: any) => any) | undefined,
) => {
  console.log('pagingResponse');
  const max_page = Math.ceil(pageObject.count / request.limit) - 1;
  return {
    items: pageObject.rows?.map(v => (fn ? fn(v?.dataValues || v) : v?.dataValues || v)),
    page: request.page,
    page_size: request.limit,
    max_page,
    has_prev: request.page > 0,
    has_next: request.page < max_page,
    total_elements: pageObject.count,
  };
};

export interface GetObjectArgs extends FindAndCountOptions {
  pagable?: any;
  exportTo?: DTOObject;
  user?: any;
  fields?: string;
}

const wrappingFunciton = function(fn: ServiceMethodItem): AsyncFunctions<any, any> {
  return async function(...params: any) {
    const sequlize = getSequelize();
    if (!sequlize) return;

    const transaction = await sequlize.transaction();
    try {
      const repo: RepoFn = {
        findAll: (model: ModelCtor<Model>, args: any) => {
          return model.findAll({ ...args, transaction });
        },
        findOne: (model: ModelCtor<Model>, args: any) => {
          return model.findOne({ ...args, transaction });
        },
        findAndCountAll: (model: ModelCtor<Model>, args: any) => {
          return model.findAndCountAll({ ...args, transaction });
        },
        getObjects: async (model: ModelCtor<Model>, args: GetObjectArgs) => {
          const isPaging = !!args.pagable;
          const page = pagingRequestParse(args.pagable);
          const target = args.exportTo;
          const user = args.user;
          const fields = args.fields;

          delete args.pagable;
          delete args.exportTo;
          delete args.user;
          delete args.fields;

          if (isPaging) {
            const output = await model.findAndCountAll(
              target?.middleware(
                {
                  ...args,
                  limit: page.limit,
                  offset: page.page * page.limit,
                  order: [
                    [page.sort, page.dir],
                    ['id', 'asc'],
                  ],
                },
                user,
                fields,
              ),
            );
            return pagingResponseParse(page, output, target?.map);
          } else {
            const output = await model.findAll(
              target?.middleware(
                {
                  ...args,
                  limit: page.limit,
                  offset: page.page * page.limit,
                  order: [
                    [page.sort, page.dir],
                    ['id', 'asc'],
                  ],
                },
                user,
                fields,
              ),
            );
            return target?.collect(output);
          }
        },
        count: (model: ModelCtor<Model>, args: any) => {
          return model.count({ ...args, transaction });
        },
        create: (model: ModelCtor<Model>, args: any) => {
          return model.create(args, { transaction });
        },
      };
      const output = await fn(repo, params);
      await transaction.commit();
      return output;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  };
};

export const createService = function<T extends ServiceMethod<T>>(properties: ServiceMethod<T>): RunningMethod<T> {
  const methods: RunningMethod<T> = {
    ...properties,
  };

  Object.keys(properties).forEach((key: string) => {
    // @ts-ignore
    methods[key] = wrappingFunciton(properties[key]);
  });

  return methods;
};
