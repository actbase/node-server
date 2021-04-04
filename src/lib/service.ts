import { AsyncFunctions } from '../types';
import { getSequelize } from './database';
import { Model, ModelCtor } from 'sequelize/types/lib/model';

export type RepoFn = {
  findAll: (model: ModelCtor<Model>, args: any) => Promise<any>;
  findOne: (model: ModelCtor<Model>, args: any) => Promise<any>;
  findAndCountAll: (model: ModelCtor<Model>, args: any) => Promise<any>;
  count: (model: ModelCtor<Model>, args: any) => Promise<any>;
  create: (model: ModelCtor<Model>, args: any) => Promise<any>;
};

export type ServiceMethodItem = AsyncFunctions<[RepoFn, object], void>;

export type ServiceMethod<T> = {
  [P in keyof T]: ServiceMethodItem;
};

export type RunningMethod<T> = {
  [P in keyof T]: AsyncFunctions<any, void>;
};

const wrappingFunciton = function(fn: ServiceMethodItem): AsyncFunctions<any, void> {
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
        count: (model: ModelCtor<Model>, args: any) => {
          return model.count({ ...args, transaction });
        },
        create: (model: ModelCtor<Model>, args: any) => {
          return model.create(args, { transaction });
        },
      };
      await fn(repo, params);
      await transaction.commit();
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
