import { getSecureFields, getSecureKey, getSequelize } from './database';
import { FindAndCountOptions, Model, ModelCtor } from 'sequelize/types/lib/model';
import { ValueObject } from './dto';
import { Transaction } from 'sequelize';
import CryptoJS from 'crypto-js';

export function encodeAES128(str: string, key: string) {
  const cipher = CryptoJS.AES.encrypt(str, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(''), // [Enter IV (Optional) 지정 방식]
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC, // [cbc 모드 선택]
  });
  return cipher.toString();
}

export function decodeAES128(str: string, key: string) {
  const input = str.startsWith('${AES}') ? str.substring(6) : str;
  const cipher = CryptoJS.AES.decrypt(input, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(''), // [Enter IV (Optional) 지정 방식]
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC, // [cbc 모드 선택]
  });
  return cipher.toString(CryptoJS.enc.Utf8);
}

export type RepoFn = {
  findAll: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<T[]>;
  findOne: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<T>;
  findAndCountAll: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<{ count: number; rows: T[] }>;
  count: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<{ [key: string]: number }>;
  create: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<T>;
  getObjects: <T extends Model>(model: ModelCtor<T>, args: GetObjectArgs) => Promise<any>;
  save: <T extends Model>(model: T) => Promise<T>;
  destroy: <T extends Model>(model: T) => Promise<void>;
  updateAll: <T extends Model>(model: ModelCtor<T>, values: { [key: string]: any }, args: any) => Promise<any>;
  destroyAll: <T extends Model>(model: ModelCtor<T>, args: any) => Promise<any>;
};

export type ServiceMethodItem = (
  repo: RepoFn,
  args: unknown[],
  options?: { transaction?: Transaction },
) => Promise<void>;

export type ServiceMethod<T> = {
  [P in keyof T]?: ServiceMethodItem;
};

export type ExportMethodType = (...args: unknown[]) => Promise<void>;
export type RunningMethod<T> = {
  [P in keyof T]?: ExportMethodType;
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
  exportTo?: ValueObject;
  exportParams?: { [key: string]: unknown };
  user?: any;
}

const wrappingFunciton = function(fn: ServiceMethodItem): ExportMethodType {
  return async function(...params: unknown[]) {
    const sequlize = getSequelize();
    if (!sequlize) return;

    const lastField = params.length > 0 && params[params.length - 1];
    const isOutTransaction = lastField instanceof Transaction;
    const transaction = isOutTransaction ? <Transaction>lastField : await sequlize.transaction();
    try {
      const repo: RepoFn = {
        findAll: async (model, args) => {
          const fields = getSecureFields(model.tableName);
          const output = await model.findAll({ ...args, transaction });
          let result = output;
          for (const field of fields ?? []) {
            result = result?.map(row => {
              if (row?.getDataValue(field)?.startsWith?.('${AES}')) {
                row.setDataValue(field, decodeAES128(row.getDataValue(field), getSecureKey()));
              }
              return row;
            });
          }
          return result;
        },
        findOne: async (model, args) => {
          const target = args.exportTo;
          const user = args.user;

          delete args.exportTo;
          delete args.user;

          const fields = getSecureFields(model.tableName);
          const output = await model.findOne(
            !target
              ? { ...args, transaction }
              : target?.middleware(
                {
                  ...args,
                  transaction,
                },
                user,
              ),
          );
          for (const field of fields ?? []) {
            if (!output?.getDataValue(field)?.startsWith?.('${AES}')) continue;
            output.setDataValue(field, decodeAES128(output.getDataValue(field), getSecureKey()));
          }
          return output;
        },
        findAndCountAll: async (model, args: any) => {
          const fields = getSecureFields(model.tableName);
          const output = await model.findAndCountAll({ ...args, transaction });
          for (const field of fields ?? []) {
            output.rows = output.rows?.map(row => {
              if (row.getDataValue(field)?.startsWith?.('${AES}')) {
                row.setDataValue(field, decodeAES128(row.getDataValue(field), getSecureKey()));
              }
              return row;
            });
          }

          return output;
        },
        getObjects: async (model: ModelCtor<Model>, args: GetObjectArgs) => {
          const fields = getSecureFields(String(model.tableName));
          const isPaging = !!args.pagable;
          const page = pagingRequestParse(args.pagable);
          const target = args.exportTo;
          const user = args.user;

          delete args.pagable;
          delete args.exportTo;
          delete args.user;

          if (isPaging) {
            const options = target?.middleware(
              {
                ...args,
                limit: page.limit,
                offset: page.page * page.limit,
                order: args.order || [[page.sort, page.dir]],
              },
              user,
            );

            const output = await model.findAndCountAll(
              options || {
                ...args,
                limit: page.limit,
                offset: page.page * page.limit,
                order: args.order || [[page.sort, page.dir]],
              },
            );
            for (const field of fields ?? []) {
              output.rows = output.rows?.map(row => {
                if (row.getDataValue(field)?.startsWith?.('${AES}')) {
                  row.setDataValue(field, decodeAES128(row.getDataValue(field), getSecureKey()));
                }
                return row;
              });
            }

            return pagingResponseParse(page, output, target?.map || (o => o));
          } else {
            const options = target?.middleware(
              {
                ...args,
                limit: args.limit,
                order: args.order || [model.primaryKeyAttributes?.map(attr => [attr, 'desc'])],
              },
              user,
            );
            let output = await model.findAll(options);
            for (const field of fields ?? []) {
              output = output?.map(row => {
                if (row.getDataValue(field)?.startsWith?.('${AES}')) {
                  row.setDataValue(field, decodeAES128(row.getDataValue(field), getSecureKey()));
                }
                return row;
              });
            }

            return target?.collect(output);
          }
        },
        count: (model, args) => {
          return model.count({ ...args, transaction });
        },
        create: async (model, args) => {
          const fields = getSecureFields(model?.tableName);
          const args2 = { ...args };

          for (const field of fields ?? []) {
            if (args2[field]?.startsWith?.('${AES}')) continue;
            args2[field] = '${AES}' + encodeAES128(args2[field], getSecureKey());
          }
          const output = await model.create(args2, { transaction });
          for (const field of fields ?? []) {
            if (!output?.getDataValue(field)?.startsWith?.('${AES}')) continue;
            output.setDataValue(field, decodeAES128(output.getDataValue(field), getSecureKey()));
          }
          return output;
        },
        save: async model => {
          const fields = getSecureFields(model.constructor.name);
          for (const field of fields ?? []) {
            if (model.getDataValue(field)?.startsWith?.('${AES}')) continue;
            model.setDataValue(field, '${AES}' + encodeAES128(model.getDataValue(field), getSecureKey()));
          }
          const output = await model.save({ transaction });
          for (const field of fields ?? []) {
            if (!output?.getDataValue(field)?.startsWith?.('${AES}')) continue;
            output.setDataValue(field, decodeAES128(output.getDataValue(field), getSecureKey()));
          }
          return output;
        },
        destroy: model => {
          return model.destroy({ transaction });
        },
        destroyAll: (model, args) => {
          return model.destroy({ ...args, transaction });
        },
        updateAll: async (model, values, args) => {
          const fields = getSecureFields(model?.tableName);
          for (const field of fields ?? []) {
            if (values[field]?.startsWith?.('${AES}')) continue;
            values[field] = '${AES}' + encodeAES128(values[field], getSecureKey());
          }

          // @ts-ignore
          return model.update(values, { ...args, transaction });
        },
      };
      const output = await fn(repo, params, { transaction });
      if (!isOutTransaction) {
        await transaction.commit();
      }
      return output;
    } catch (e) {
      if (!isOutTransaction) {
        await transaction.rollback();
      }
      throw e;
    }
  };
};

export const createService = function <T extends ServiceMethod<T>>(properties: T): RunningMethod<T> {
  let methods: RunningMethod<T> = {};
  Object.keys(properties).forEach(key => {
    // @ts-ignore
    methods[key] = wrappingFunciton(properties[key]);
  });

  return methods;
};
