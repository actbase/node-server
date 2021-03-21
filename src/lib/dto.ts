import { DTOObject, RequestParam } from '../types';

export const createDto = (name: string, properties: { [key: string]: RequestParam }): DTOObject | undefined => {
  if (!properties) return undefined;

  const map = (item: any) => {
    let o = item;
    if (o.dataValues) o = o.dataValues;
    return Object.keys(properties).reduce((p: { [key: string]: any }, key) => {
      if (properties[key].type === 'number') {
        p[key] = parseInt(String(o[key]));
      } else if (properties[key].type === 'array' && typeof o[key] === 'string') {
        p[key] = JSON.parse(o[key]);
      } else if (properties[key].type === 'object' && typeof o[key] === 'string') {
        p[key] = JSON.parse(o[key]);
      } else {
        p[key] = o[key];
      }
      return p;
    }, {});
  };

  return {
    __dto_name: name,
    properties,
    map,
    collect: (o: any) => o?.map((v: any) => map(v)),
  };
};
