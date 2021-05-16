import { DatabaseOption } from '../types';
import { DataTypes, Sequelize } from 'sequelize';
import { Options } from 'sequelize/types/lib/sequelize';
import {
  Model,
  ModelAttributeColumnOptions,
  ModelAttributeColumnReferencesOptions,
  ModelCtor,
  ModelOptions,
  ModelValidateOptions,
} from 'sequelize/types/lib/model';
import { TypeIsDefine } from '../contants/TypeIs';

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

interface ModelPreference extends TypeIsDefine {
  unique?: boolean | string | { name: string; msg: string };
  primaryKey?: boolean;
  autoIncrement?: boolean;
  autoIncrementIdentity?: boolean;
  references?: string | ModelAttributeColumnReferencesOptions;
  onUpdate?: string;
  onDelete?: string;
  validate?: ModelValidateOptions;

  connectTo?: any;
}

interface ModelExtraOptions extends ModelOptions {
  with?: string[];
}

export interface DBModel extends ModelCtor<Model> {}

export const createModel = (
  name: string,
  columns: { [key: string]: ModelPreference },
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

  Object.keys(columns).forEach((key: string) => {
    const column = columns[key];
    const type = 'function' === typeof column.type ? column.type() : column.type;

    if (column.connectTo) {
      delete column.connectTo;
    }

    _column[key] = {
      ...column,
      type: type.toSequelize(),
      allowNull: !column.required,
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
    logging: options?.debug ? console.log : false,
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
