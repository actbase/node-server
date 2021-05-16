import { FindAndCountOptions, Model, ModelCtor } from 'sequelize/types/lib/model';
import { TypeIsObject } from '../contants/TypeIs';
import { literal } from 'sequelize';

export interface ValueObject {
  __dto_name: string;
  defineModel?: ModelCtor<any>;
  map: (o: any) => any;
  collect: (o: any[]) => any[];
  middleware: (options: any, user: any) => FindAndCountOptions;
}

export interface VOProperties {
  type: TypeIsObject | (() => TypeIsObject) | ValueObject;
  comment?: string;
  defaultValue?: unknown;

  query?: ((args: { user?: any }) => string) | string;
  column?: string;
}

export function createDto<T extends Model & { [key: string]: unknown }>(
  name: string,
  properties: { [key: string]: VOProperties },
  entity?: {
    defineModel?: ModelCtor<T>;
    middleware?: (options: any, attrs: any, user: any, fields: any) => void;
  },
): ValueObject {
  const map = (item: T) => {
    const o: any = item?.dataValues || item;
    return o;
    // return Object.keys(properties).reduce((p: { [key: string]: any }, key) => {
    //   // if (properties[key].type === 'number') {
    //   //   p[key] = parseInt(String(o[key]));
    //   // } else if (properties[key].type === 'array' && typeof o[key] === 'string') {
    //   //   p[key] = JSON.parse(o[key] as string);
    //   // } else if (properties[key].type === 'object' && typeof o[key] === 'string') {
    //   //   p[key] = JSON.parse(o[key] as string);
    //   // } else {
    //   //   p[key] = item[key];
    //   // }
    //   // return p;
    // }, {});
  };

  const ATTRS = Object.keys(entity?.defineModel?.rawAttributes || {});
  return {
    __dto_name: name,
    defineModel: entity?.defineModel,
    map,
    collect: (o: any) => o?.map((v: any) => map(v)),
    middleware: (options, user) => {
      let attrs = Object.keys(properties).reduce((x: (string | object)[], y) => {
        const property = properties[y];
        if (property.query) {
          const query = 'function' === typeof property.query ? property.query({ user }) : property.query;
          x.push([literal(query), y]);
          return x;
        }

        if ((<ValueObject>property.type)?.__dto_name) {
          const dto = <ValueObject>property.type;
          if (!options.include) options.include = [];
          options.include.push(dto.middleware({ model: dto.defineModel }, user));
        }

        x.push(property.column || y);
        return x;
      }, []);
      attrs = attrs.filter((item, index) => attrs.indexOf(item) === index);

      // entity?.middleware?.(options, attrs, user, fields);

      if (!options.attributes) options.attributes = [];
      options.attributes = options.attributes.concat(attrs.filter(v => typeof v === 'object' || ATTRS.includes(v)));

      return options;
    },
  };
}
