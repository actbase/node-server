import { DTOObject, RequestParam } from '../types';

export const createDto = (name: string, properties: { [key: string]: RequestParam }): DTOObject | undefined => {
  if (!properties) return undefined;

  const map = (item: any) => {
    return item;
  };

  return {
    __dto_name: name,
    properties,
    map,
    collect: (o: any) => o?.map((v: any) => map(v)),
  };
};
