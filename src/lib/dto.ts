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

interface ConfigSpec {
  definitions: {
    [key: string]: {
      type: string;
      properties: {
        [key: string]: {
          type?: 'string';
          description?: 'string';
        };
      };
    };
  };
}

const config: ConfigSpec = {
  definitions: {},
};

export function getDtoDefinitions() {
  return config.definitions;
}

export function createDto<T extends Model & { [key: string]: unknown }>(
  name: string,
  properties: { [key: string]: VOProperties },
  entity?: {
    defineModel?: ModelCtor<T>;
    middleware?: (options: any, attrs: any, user: any, fields: any) => void;
  },
): ValueObject {
  config.definitions[name] = {
    type: 'object',
    properties: Object.keys(properties).reduce((p: { [key: string]: any }, key) => {
      const property = properties[key];
      const type = 'function' === typeof property.type ? property.type() : property.type;
      if ((<ValueObject>type).__dto_name) {
        p[key] = {
          $ref: '#/components/schemas/' + (<ValueObject>type).__dto_name,
        };
      } else {
        let args: { [key: string]: any } = (<TypeIsObject>type).toSwagger?.();
        if (!args) args = { type: String(type) };
        args.description = property.comment;
        p[key] = args;
      }
      return p;
    }, {}),
  };

  const map = (item: T) => {
    const o: any = item?.dataValues || item;
    return Object.keys(properties).reduce((p: { [key: string]: unknown }, key) => {
      const property = properties[key];
      let type = typeof property.type === 'function' ? property.type() : property.type;
      if ((<TypeIsObject>type)?.fixValue) {
        p[key] = (<TypeIsObject>type)?.fixValue?.(o[key]);
      } else {
        p[key] = o[key];
      }
      return p;
    }, {});
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
