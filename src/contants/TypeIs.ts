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
}

export interface TypeIsDefine {
  type: TypeIsObject | (() => TypeIsObject);
  comment?: string;
  defaultValue?: unknown;
  required?: boolean;
}

export const TypeArray = (o: (...options: any) => TypeIsObject) => {
  return () => ({
    __name: 'array',
    toSwagger: () => ({
      type: 'array',
      items: o().toSwagger(),
    }),
    toSequelize: () => DataTypes.JSON,
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
  }),
  LONG: (options?: { decimals?: number; precision?: number; scale?: number }): TypeIsObject => ({
    __name: 'long',
    toSwagger: () => ({
      type: 'integer',
      format: 'int64',
    }),
    toSequelize: () => DataTypes.INTEGER(options),
  }),
  FLOAT: (length?: number, decimals?: number): TypeIsObject => ({
    __name: 'float',
    toSwagger: () => ({
      type: 'integer',
      format: 'float',
    }),
    toSequelize: () => DataTypes.FLOAT(length, decimals),
  }),
  DOUBLE: (length?: number, decimals?: number): TypeIsObject => ({
    __name: 'double',
    toSwagger: () => ({
      type: 'number',
      format: 'double',
    }),
    toSequelize: () => DataTypes.DOUBLE(length, decimals),
  }),
  STRING: (length?: number, binary?: boolean): TypeIsObject => ({
    __name: 'string',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.STRING(length, binary),
  }),
  TEXT: (length?: TextLength): TypeIsObject => ({
    __name: 'text',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.TEXT({ length }),
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
