import { FindAndCountOptions, Model, ModelCtor } from 'sequelize/types/lib/model';
import { DataType, TypeIsDefine, ValueObjectDefault } from '../contants/TypeIs';
import { literal } from 'sequelize';
import { parseType } from '../types';

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

  query?: ((args: { user?: any; association: string; exportParams?: { [key: string]: unknown} }) => string) | string;
  column?: string;
  render?: (data: unknown) => unknown;
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
      const tp = parseType(property.type);
      if (tp.isDto) {
        p[key] = {
          $ref: '#/components/schemas/' + tp.dto?.__dto_name,
        };
      } else {
        let args: { [key: string]: any } = tp.typeIs?.toSwagger?.() || {};
        if (!args) args = { type: String(tp.typeIs) };
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
      const tp = parseType(property.type);

      if (tp?.isDto) {
        const k = `__${property.reference}`;
        p[key] = o?.[k] ? tp.dto?.map(o[k]) : tp.dto?.map(o?.[key]) || o?.[key];
      } else if (tp?.typeIs?.fixValue) {
        p[key] = tp?.typeIs?.fixValue(o?.[key]);
      } else {
        p[key] = o?.[key];
      }

      if (property.render) {
        p[key] = property.render(p[key]);
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
            const association =
              (options?.full_associations ? "`" + options?.full_associations + "`" : options?.full_associations) ||
              options?.association ||
              entity?.defineModel?.tableName ||
              name;
            const query = 'function' === typeof property.query ? property.query({ user, association, exportParams: options.exportParams }) : property.query;
            x.push([literal(query), y]);
            return x;
          }

          const tp = parseType(property.type);
          if (tp.isDto) {
            if (!options.include) options.include = [];
            const association = `__${property?.reference || y}`;
            const associations = [options?.association, association].filter(v => !!v);

            let where = undefined;
            if (options?.where?.[association]) {
              where = { ...options?.where?.[association] };
              delete options?.where?.[association];
            }

            options.include.push(
              tp.dto?.middleware(
                {
                  model: tp.dto?.defineModel,
                  where,
                  required: !!(options?.required || (where && Object.keys(where).length > 0 && tp.dto?.defineModel)),
                  association: association,
                  full_associations: associations.join('->'),
                  as: y,
                },
                user,
              ),
            );
          }
          x.push(property.column || y);
        }
        return x;
      }, []);
      attrs = attrs.filter((item, index) => attrs.indexOf(item) === index);

      if (!options.attributes) options.attributes = [];
      options.attributes = options.attributes.concat(attrs.filter(v => typeof v === 'object' || ATTRS.includes(v)));

      return options;
    },
  };
}
