export interface DataTypeOf {
  swagger?: {
    type?: string;
    format?: string;
    enum?: any;
  };
  sequalize?: any;
}

export interface DataTypeObject {
  [key: string]: (...args: any) => DataTypeOf;
}

export const DataType = {
  INT: () => ({
    swagger: {
      type: 'integer',
      format: 'int32',
    },
  }),
  LONG: () => ({
    swagger: {
      type: 'integer',
      format: 'int64',
    },
  }),
  FLOAT: () => ({
    swagger: {
      type: 'number',
      format: 'float',
    },
  }),
  DOUBLE: () => ({
    swagger: {
      type: 'number',
      format: 'double',
    },
  }),
  STRING: () => ({
    swagger: {
      type: 'string',
    },
  }),
  PASSWORD: () => ({
    swagger: {
      type: 'string',
      format: 'password',
    },
  }),
  ENUM: (...values: string[]) => ({
    swagger: {
      type: 'string',
      enum: values,
      example: values[0],
    },
  }),
  JSON: () => ({
    swagger: {
      type: 'object',
    },
  }),
  BASE64: () => ({
    swagger: {
      type: 'string',
      format: 'byte',
    },
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
  }),
  DATEONLY: () => ({
    swagger: {
      type: 'string',
      format: 'date',
    },
  }),
  DATETIME: () => ({
    swagger: {
      type: 'string',
      format: 'date-time',
    },
  }),
};
