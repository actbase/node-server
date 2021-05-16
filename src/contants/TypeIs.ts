import { DataTypes } from 'sequelize';
import { AbstractDataType, AbstractDataTypeConstructor, BlobSize, TextLength } from 'sequelize/types/lib/data-types';

export interface TypeIsObject {
  __name: string;
  toSwagger: () => {
    type?: string;
    enum?: string[];
    example?: string;
    format?: string;
  };
  toSequelize: () => AbstractDataType | AbstractDataTypeConstructor;
  fixValue?: (data: any) => unknown;
}

export interface TypeIsDefine {
  type: TypeIsObject | (() => TypeIsObject);
  comment?: string;
  defaultValue?: unknown;
  required?: boolean;
}

export const TypeArray = (o: (...options: any) => TypeIsObject) => {
  return (...x: any) => ({
    __name: 'array',
    toSwagger: () => ({
      type: 'array',
      items: o(...x).toSwagger(),
    }),
    toSequelize: () => DataTypes.JSON,
  });
};

export const TypePaging = (o: (...options: any) => TypeIsObject) => {
  return () => ({
    __name: 'paging',
    toSwagger: () => ({
      type: 'object',
      properties: {
        page: {
          type: 'number',
          comment: '현재 페이지',
        },
        page_size: {
          type: 'number',
          comment: '페이지당 표시 갯수',
        },
        max_page: {
          type: 'number',
          comment: '최대페이지',
        },
        has_prev: {
          type: 'boolean',
          comment: '이전 이동가능 여부',
        },
        has_next: {
          type: 'boolean',
          comment: '다음 이동가능 여부',
        },
        total_elements: {
          type: 'number',
          comment: '전체 레코드개수',
        },
        items: {
          type: 'array',
          items: o().toSwagger(),
        },
      },
    }),
  });
};

export const TypeIs = {
  INT: (options?: { decimals?: number; precision?: number; scale?: number }): TypeIsObject => ({
    __name: 'int',
    toSwagger: () => ({
      type: 'integer',
      format: 'int32',
    }),
    toSequelize: () => DataTypes.INTEGER(options),
    fixValue: o => {
      return parseInt(String(o), 10);
    },
  }),
  LONG: (options?: { decimals?: number; precision?: number; scale?: number }): TypeIsObject => ({
    __name: 'long',
    toSwagger: () => ({
      type: 'integer',
      format: 'int64',
    }),
    toSequelize: () => DataTypes.INTEGER(options),
    fixValue: o => {
      return parseInt(String(o), 10);
    },
  }),
  FLOAT: (length?: number, decimals?: number): TypeIsObject => ({
    __name: 'float',
    toSwagger: () => ({
      type: 'integer',
      format: 'float',
    }),
    toSequelize: () => DataTypes.FLOAT(length, decimals),
    fixValue: o => {
      return parseFloat(String(o));
    },
  }),
  DOUBLE: (length?: number, decimals?: number): TypeIsObject => ({
    __name: 'double',
    toSwagger: () => ({
      type: 'number',
      format: 'double',
    }),
    toSequelize: () => DataTypes.DOUBLE(length, decimals),
    fixValue: o => {
      return parseFloat(String(o));
    },
  }),
  STRING: (length?: number, binary?: boolean): TypeIsObject => ({
    __name: 'string',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.STRING(length, binary),
    fixValue: o => {
      return String(o);
    },
  }),
  TEXT: (length?: TextLength): TypeIsObject => ({
    __name: 'text',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.TEXT({ length }),
    fixValue: o => {
      return String(o);
    },
  }),
  PASSWORD: (): TypeIsObject => ({
    __name: 'password',
    toSwagger: () => ({
      type: 'string',
      format: 'password',
    }),
    toSequelize: () => DataTypes.STRING(512),
  }),
  ENUM: (...texts: string[]): TypeIsObject => ({
    __name: 'enum',
    toSwagger: () => ({
      type: 'string',
      enum: texts,
      example: texts[0],
    }),
    toSequelize: () => DataTypes.ENUM(...texts),
    fixValue: o => {
      return texts.includes(String(o)) ? String(o) : undefined;
    },
  }),
  JSON: (): TypeIsObject => ({
    __name: 'json',
    toSwagger: () => ({
      type: 'object',
    }),
    toSequelize: () => DataTypes.JSON,
  }),
  BASE64: (length?: BlobSize): TypeIsObject => ({
    __name: 'base64',
    toSwagger: () => ({
      type: 'string',
      format: 'byte',
    }),
    toSequelize: () => DataTypes.BLOB(length),
  }),
  BINARY: (length?: BlobSize): TypeIsObject => ({
    __name: 'binary',
    toSwagger: () => ({
      type: 'string',
      format: 'binary',
    }),
    toSequelize: () => DataTypes.BLOB(length),
  }),
  BOOLEAN: (): TypeIsObject => ({
    __name: 'boolean',
    toSwagger: () => ({
      type: 'boolean',
    }),
    toSequelize: () => DataTypes.BOOLEAN,
    fixValue: o => {
      return String(o) === 'true' ? true : String(o) === 'false' ? false : !!o;
    },
  }),
  DATEONLY: (): TypeIsObject => ({
    __name: 'date',
    toSwagger: () => ({
      type: 'string',
      format: 'date',
    }),
    toSequelize: () => DataTypes.DATEONLY(),
  }),
  DATETIME: (): TypeIsObject => ({
    __name: 'datetime',
    toSwagger: () => ({
      type: 'string',
      format: 'date-time',
    }),
    toSequelize: () => DataTypes.DATE,
  }),
};
