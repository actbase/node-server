import { DatabaseOption } from '../types';
import { DataTypes, Sequelize } from 'sequelize';
import { Options } from 'sequelize/types/lib/sequelize';
import {
  Model,
  ModelAttributeColumnOptions,
  ModelAttributes,
  ModelCtor,
  ModelOptions,
} from 'sequelize/types/lib/model';

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

interface ModelExtraOptions extends ModelOptions {
  with?: string[];
}

export interface DBModel extends ModelCtor<Model> {}

export const createModel = (
  name: string,
  column: ModelAttributes,
  options?: ModelExtraOptions,
  associate?: () => void,
): DBModel => {
  const _column: { [key: string]: ModelAttributeColumnOptions } = {};

  if (options?.with?.includes('*') || options?.with?.includes('id')) {
    _column.id = {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      comment: '고유키',
    };
  }

  Object.keys(column).forEach(key => {
    // @ts-ignore
    let type = column[key].type;
    if (typeof type === 'function') {
      type = type();
    }
    if (type.db) {
      type = type.db;
    }
    _column[key] = {
      // @ts-ignore
      ...column[key],
      type,
    };
  });

  if (options?.with?.includes('*') || options?.with?.includes('created_at')) {
    _column.created_at = {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '등록일',
    };
  }

  if (options?.with?.includes('*') || options?.with?.includes('updated_at')) {
    _column.updated_at = {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '수정일',
    };
  }

  const domain = config.container?.define(name, _column, {
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

  //@ts-ignore
  return domain;
};

export const dbInit = (options?: DatabaseOption) => {
  if (!options) return undefined;
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
  if (!config.container) return;
  config.associates?.forEach(v => {
    // @ts-ignore
    return v.associate(v.domain);
  });
};

export const getSequelize = (): Sequelize | undefined => {
  return config.container;
};
