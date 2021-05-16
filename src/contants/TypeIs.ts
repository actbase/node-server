import { DataTypes } from 'sequelize';
import { AbstractDataType, AbstractDataTypeConstructor } from 'sequelize/types/lib/data-types';

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

export const ArrayIs = (o: (...options: any) => TypeIsObject) => ({
  __name: 'array',
  toSwagger: () => ({
    type: 'array',
    items: o().toSwagger(),
  }),
  toSequelize: () => DataTypes.JSON,
});

export const TypeIs: { [key: string]: (...options: any) => TypeIsObject } = {
  INT: (...options: any) => ({
    __name: 'int',
    toSwagger: () => ({
      type: 'integer',
      format: 'int32',
    }),
    toSequelize: () => DataTypes.INTEGER(...options),
  }),
  LONG: (...options: any) => ({
    __name: 'long',
    toSwagger: () => ({
      type: 'integer',
      format: 'int64',
    }),
    toSequelize: () => DataTypes.INTEGER(...options),
  }),
  FLOAT: (...options: any) => ({
    __name: 'float',
    toSwagger: () => ({
      type: 'integer',
      format: 'float',
    }),
    toSequelize: () => DataTypes.FLOAT(...options),
  }),
  DOUBLE: (...options: any) => ({
    __name: 'double',
    toSwagger: () => ({
      type: 'number',
      format: 'double',
    }),
    toSequelize: () => DataTypes.DOUBLE(...options),
  }),
  STRING: (...options: any) => ({
    __name: 'string',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.STRING(...options),
  }),
  TEXT: (...options: any) => ({
    __name: 'text',
    toSwagger: () => ({
      type: 'string',
    }),
    toSequelize: () => DataTypes.TEXT(...options),
  }),
  PASSWORD: (...options: any) => ({
    __name: 'password',
    toSwagger: () => ({
      type: 'string',
      format: 'password',
    }),
    toSequelize: () => DataTypes.STRING(...options),
  }),
  ENUM: (...options: any) => ({
    __name: 'enum',
    toSwagger: () => ({
      type: 'string',
      enum: options,
      example: options[0],
    }),
    toSequelize: () => DataTypes.ENUM(...options),
  }),
  JSON: (..._options: any) => ({
    __name: 'json',
    toSwagger: () => ({
      type: 'object',
    }),
    toSequelize: () => DataTypes.JSON,
  }),
  BASE64: (...options: any) => ({
    __name: 'base64',
    toSwagger: () => ({
      type: 'string',
      format: 'byte',
    }),
    toSequelize: () => DataTypes.TEXT(...options),
  }),
  BINARY: (...options: any) => ({
    __name: 'binary',
    toSwagger: () => ({
      type: 'string',
      format: 'binary',
    }),
    toSequelize: () => DataTypes.BLOB(...options),
  }),
  BOOLEAN: (..._options: any) => ({
    __name: 'boolean',
    toSwagger: () => ({
      type: 'boolean',
    }),
    toSequelize: () => DataTypes.BOOLEAN,
  }),
  DATEONLY: (..._options: any) => ({
    __name: 'date',
    toSwagger: () => ({
      type: 'string',
      format: 'date',
    }),
    toSequelize: () => DataTypes.DATEONLY(),
  }),
  DATETIME: (..._options: any) => ({
    __name: 'datetime',
    toSwagger: () => ({
      type: 'string',
      format: 'date-time',
    }),
    toSequelize: () => DataTypes.DATE,
  }),
};
