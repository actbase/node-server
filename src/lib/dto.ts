import { FindAndCountOptions, Model, ModelCtor } from 'sequelize/types/lib/model';
import { DataType, TypeIsDefine, TypeIsObject, ValueObjectDefault } from '../contants/TypeIs';
import { literal } from 'sequelize';

export interface ValueObject extends ValueObjectDefault {
  defineModel?: ModelCtor<any>;
  map: (o: any) => any;
  collect: (o: any[]) => any[];
  middleware: (options: any, user: any) => FindAndCountOptions;
}

export interface VOProperties {
  type: DataType;
  comment?: string;
  defaultValue?: unknown;
  reference?: string;

  query?: ((args: { user?: any; association: string }) => string) | string;
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
      console.log('property', key, property, type);
      if ((<TypeIsObject>type)?.fixValue) {
        p[key] = (<TypeIsObject>type)?.fixValue?.(o[key]);
      } else if (property.reference && (<ValueObject>type)?.__dto_name) {
        p[key] = o[`__${property.reference}`] ? (<ValueObject>type)?.map(o[`__${property.reference}`]) : o[key];
      } else {
        p[key] = o[key];
      }
      return p;
    }, {});
  };

  const outProperties = Object.keys(properties).reduce((p: { [key: string]: TypeIsDefine }, key) => {
    p[key] = {
      // @ts-ignore
      type: properties[key].type,
    };
    return p;
  }, {});

  const ATTRS = Object.keys(entity?.defineModel?.rawAttributes || {});
  return {
    __dto_name: name,
    defineModel: entity?.defineModel,
    properties: outProperties,
    map,
    collect: (o: any) => o?.map((v: any) => map(v)),
    middleware: (options, user) => {
      let attrs = Object.keys(properties).reduce((x: (string | object)[], y) => {
        const property = properties[y];
        if (property) {
          if (property.query) {
            const query =
              'function' === typeof property.query
                ? property.query({ user, association: options?.association || entity?.defineModel?.tableName || name })
                : property.query;
            x.push([literal(query), y]);
            return x;
          }

          if (property.type && '__dto_name' in property.type) {
            const dto = <ValueObject>property.type;
            if (!options.include) options.include = [];
            options.include.push(
              dto.middleware({ model: dto.defineModel, association: `__${property?.reference || y}`, as: y }, user),
            );
          }

          x.push(property.column || y);
        }
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
