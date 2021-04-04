import { DataTypes, IntegerDataTypeOptions } from 'sequelize';
import { AbstractDataTypeConstructor, NumberDataTypeOptions } from 'sequelize/types/lib/data-types';

export interface DataTypeOf {
  swagger?: {
    type?: string;
    format?: string;
    enum?: string[];
    example?: any;
  };
  db?: AbstractDataTypeConstructor;
}

export interface DataTypeObject {
  [key: string]: (...args: any) => DataTypeOf;
}

export const DataType = {
  INT: (options: IntegerDataTypeOptions | undefined) => ({
    swagger: {
      type: 'integer',
      format: 'int32',
    },
    db: DataTypes.INTEGER(options),
  }),
  LONG: (options: IntegerDataTypeOptions | undefined) => ({
    swagger: {
      type: 'integer',
      format: 'int64',
    },
    db: DataTypes.INTEGER(options),
  }),
  FLOAT: (options: NumberDataTypeOptions | undefined) => ({
    swagger: {
      type: 'number',
      format: 'float',
    },
    db: DataTypes.INTEGER(options),
  }),
  DOUBLE: (options: NumberDataTypeOptions | undefined) => ({
    swagger: {
      type: 'number',
      format: 'double',
    },
    db: DataTypes.INTEGER(options),
  }),
  STRING: (length = 255) => ({
    swagger: {
      type: 'string',
    },
    db: DataTypes.STRING({ length }),
  }),
  TEXT: (length = undefined) => ({
    swagger: {
      type: 'string',
    },
    db: DataTypes.TEXT({ length }),
  }),
  PASSWORD: () => ({
    swagger: {
      type: 'string',
      format: 'password',
    },
    db: DataTypes.STRING({ length: 255 }),
  }),
  ENUM: (...values: string[]) => ({
    swagger: {
      type: 'string',
      enum: values,
      example: values[0],
    },
    db: DataTypes.ENUM(...values),
  }),
  JSON: () => ({
    swagger: {
      type: 'object',
    },
    db: DataTypes.JSON,
  }),
  BASE64: () => ({
    swagger: {
      type: 'string',
      format: 'byte',
    },
    db: DataTypes.TEXT,
  }),
  BINARY: () => ({
    swagger: {
      type: 'string',
      format: 'binary',
    },
  }),
  BOOLEAN: () => ({
    swagger: {
      type: 'boolean',
    },
    db: DataTypes.BOOLEAN,
  }),
  DATEONLY: () => ({
    swagger: {
      type: 'string',
      format: 'date',
    },
    db: DataTypes.DATEONLY,
  }),
  DATETIME: () => ({
    swagger: {
      type: 'string',
      format: 'date-time',
    },
    db: DataTypes.DATE,
  }),
};
