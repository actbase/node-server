import { DataTypes } from 'sequelize';
import { AbstractDataType, AbstractDataTypeConstructor, BlobSize, TextLength } from 'sequelize/types/lib/data-types';

export interface TypeIsObject {
  __name: string;
  toSwagger: () => {
    type?: string;
    enum?: string;
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
  INT: (options: { decimals?: number; precision?: number; scale?: number }) => ({
    __name: 'int',
    toSwagger: () => ({
      type: 'integer',
      format: 'int32',
    }),
    toSequelize: () => DataTypes.INTEGER(options),
  }),
  LONG: (options: { decimals?: number; precision?: number; scale?: number }) => ({
    __name: 'long',
    toSwagger: () => ({
      type: 'integer',
      format: 'int64',
    }),
    toSequelize: () => DataTypes.INTEGER(options),
  }),
  FLOAT: (length?: number, decimals?: number) => ({
    __name: 'float',
    toSwagger: () => ({
      type: 'integer',
      format: 'float',
    }),
    toSequelize: () => DataTypes.FLOAT(length, decimals),
  }),
  DOUBLE: (length?: number, decimals?: number) => ({
    __name: 'double',
    toSwagger: () => ({
      type: 'number',
      format: 'double',
    }),
    toSequelize: () => DataTypes.DOUBLE(length, decimals),
  }),
  STRING: (length?: number, binary?: boolean) => ({
    __name: 'string',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.STRING(length, binary),
  }),
  TEXT: (length?: TextLength) => ({
    __name: 'text',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.TEXT({ length }),
  }),
  PASSWORD: () => ({
    __name: 'password',
    toSwagger: () => ({
      type: 'string',
      format: 'password',
    }),
    toSequelize: () => DataTypes.STRING(512),
  }),
  ENUM: (...texts: string[]) => ({
    __name: 'enum',
    toSwagger: () => ({
      type: 'string',
      enum: texts,
      example: texts[0],
    }),
    toSequelize: () => DataTypes.ENUM(...texts),
  }),
  JSON: () => ({
    __name: 'json',
    toSwagger: () => ({
      type: 'object',
    }),
    toSequelize: () => DataTypes.JSON,
  }),
  BASE64: (length?: BlobSize) => ({
    __name: 'base64',
    toSwagger: () => ({
      type: 'string',
      format: 'byte',
    }),
    toSequelize: () => DataTypes.BLOB(length),
  }),
  BINARY: (length?: BlobSize) => ({
    __name: 'binary',
    toSwagger: () => ({
      type: 'string',
      format: 'binary',
    }),
    toSequelize: () => DataTypes.BLOB(length),
  }),
  BOOLEAN: () => ({
    __name: 'boolean',
    toSwagger: () => ({
      type: 'boolean',
    }),
    toSequelize: () => DataTypes.BOOLEAN,
  }),
  DATEONLY: () => ({
    __name: 'date',
    toSwagger: () => ({
      type: 'string',
      format: 'date',
    }),
    toSequelize: () => DataTypes.DATEONLY(),
  }),
  DATETIME: () => ({
    __name: 'datetime',
    toSwagger: () => ({
      type: 'string',
      format: 'date-time',
    }),
    toSequelize: () => DataTypes.DATE,
  }),
};
