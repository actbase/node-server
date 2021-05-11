import { DTOObject, RequestParam } from '../types';
import { Model, ModelCtor } from 'sequelize/types/lib/model';

export function createDto<T extends Model & { [key: string]: unknown }>(
  name: string,
  properties: { [key: string]: RequestParam },
  entity?: {
    defineModel?: ModelCtor<T>;
    middleware?: (options: any, attrs: any, user: any, fields: any) => void;
  },
): DTOObject | undefined {
  if (!properties) return undefined;

  const map = (item: T) => {
    const o: any = item?.dataValues || item;
    return Object.keys(properties).reduce((p: { [key: string]: any }, key) => {
      if (properties[key].type === 'number') {
        p[key] = parseInt(String(o[key]));
      } else if (properties[key].type === 'array' && typeof o[key] === 'string') {
        p[key] = JSON.parse(o[key] as string);
      } else if (properties[key].type === 'object' && typeof o[key] === 'string') {
        p[key] = JSON.parse(o[key] as string);
      } else {
        p[key] = item[key];
      }
      return p;
    }, {});
  };

  const DEFAULT_COL = Object.keys(properties);
  const ATTRS = Object.keys(entity?.defineModel?.rawAttributes || {});

  return {
    __dto_name: name,
    properties,
    map,
    collect: (o: any) => o?.map((v: any) => map(v)),
    middleware: (options, user, fields) => {
      let attrs = [...DEFAULT_COL];
      attrs = attrs.concat((fields || '').split(',').map(v => v.trim()));
      attrs = attrs.filter((item, index) => attrs.indexOf(item) === index);

      const ignores = attrs.filter(v => v?.startsWith?.('!'));
      if (ignores?.length > 0) {
        for (const ignore of ignores) {
          attrs.splice(attrs.indexOf(ignore.substring(1)), 1);
        }
      }

      if (attrs.indexOf('*') >= 0) {
        attrs = attrs.concat(ATTRS);
      }

      entity?.middleware?.(options, attrs, user, fields);

      if (!options.attributes) options.attributes = [];
      options.attributes = options.attributes.concat(attrs.filter(v => typeof v === 'object' || ATTRS.includes(v)));

      return options;
    },
  };
}
