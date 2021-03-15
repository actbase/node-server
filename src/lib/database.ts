import { DatabaseOption } from '../types';
import { Sequelize } from 'sequelize';
import { Options } from 'sequelize/types/lib/sequelize';
import { Model, ModelAttributes, ModelOptions } from 'sequelize/types/lib/model';

interface ConfigSpec {
  container?: Sequelize;
  associates?: {
    domain?: typeof Model;
    associate: (domain: Model | undefined) => void;
  }[];
}

const config: ConfigSpec = {
  associates: [],
};

export const createModel = (
  name: string,
  column: ModelAttributes,
  options?: ModelOptions,
  associate?: () => void,
): Model | undefined => {
  const domain = config.container?.define(name, column, {
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    ...options,
    tableName: name,
  });
  if (associate) {
    config.associates?.push({
      domain,
      associate,
    });
  }
  // @ts-ignore
  return domain;
};

export const dbInit = (options: DatabaseOption) => {
  const args: Options = {
    host: options.host,
    dialect: options.dialect,
    logging: false,
    timezone: '+09:00',
    pool: {
      max: 20,
      idle: 4800,
      acquire: 60000,
    },
  };
  config.container = new Sequelize(options.scheme, options.username, options.password, args);
  return config.container;
};

export const dbAssociate = () => {
  config.associates?.forEach(v => {
    // @ts-ignore
    return v.associate(v.domain);
  });
};
