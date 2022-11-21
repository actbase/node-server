# @actbase/node-server

[Node.js](https://nodejs.org/)를 위한 [express](https://expressjs.com)기반의 웹 프레임워크.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]

```js
const app = require('@actbase/node-server');

app.run();
```

## 설치

@actbase/node-server는 [npm registry](https://www.npmjs.com/)를 통해 사용할 수 있는 [Node.js](https://nodejs.org/en/) 모듈 입니다.

설치하기 전에 [Node.js를 다운로드](https://nodejs.org/en/download/)하여 설치해주세요. Node.js 0.10 이상이 필요합니다.

만약 새로운 프로젝트를 만들 경우 [`npm init`](https://docs.npmjs.com/creating-a-package-json-file)을 사용하여 프로젝트를 생성 합니다.

설치는 [`npm install`](https://docs.npmjs.com/getting-started/installing-npm-packages-locally)을 사용하여 설치됩니다.

```shell
$ npm install @actbase/node-server
```

## 특징

- Express 기반의 웹 프레임워크
- Async await 지원
- Oauth 지원
- sequelize기반의 orm지원
- Swagger 3 기본 지원

## 시작

### Route
#### 앤드포인트(URI)가 클라이언트 요청에 응답하는 방법을 나타내는 Route입니다.

```js
import { createRoute } from '@actbase/node-server';
import UserService from '../services/UserSerivce';

const execute = ({ user }) => {
  return UserService.getMe(user);
};

export default createRoute(
  {
    method: 'GET',
    uri: '/me',
  },
  execute,
  {
    tags: 'User',
    description: 'Get Me',
  },
);
```

### Model
#### Database Table 정보를 담고있는 Model 입니다.

```js
import { createModel, TypeIs } from '@actbase/node-server';

const User = createModel(
  'users',
  {
    username: { type: TypeIs.STRING, comment: '아이디' },
    password: { type: TypeIs.STRING, comment: '비밀번호' },
  },
  {
    with: ['*'],
  },
);

export default User;
```

### DTO
#### 데이터 객체 선언(Data Transfer Object) 파일입니다.

```js
import { createDto } from '@actbase/node-server';
import User from '../models/User';

export default createDto(
  'UserMeDto',
  {
    username: { type: TypeIs.STRING, comment: '아이디' },
  },
  {
    defineModel: User,
  },
);
```

### Service
#### 비즈니스 로직을 담고있는 Service입니다.

```js
import { createService } from '@actbase/node-server';
import User from '../models/User';
import UserMeDto from '../dtos/UserMeDto';

export default createService({
  getMe: (repo, [user]) => {
    const userMe = repo.findOne(User, {
      exportTo: UserMeDto,
      where: {
        id: user.id,
      },
    });
    if (!userMe) throw { status: 404, message: 'Not found User' };
    return UserMeDto.map(userMe);
  },
});
```

[npm-image]: https://img.shields.io/npm/v/@actbase/node-server.svg
[npm-url]: https://npmjs.org/package/@actbase/node-server
[downloads-image]: https://img.shields.io/npm/dm/@actbase/node-server.svg
[downloads-url]: https://npmjs.org/package/@actbase/node-server
