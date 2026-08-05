import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  it('/ (GET) 统一返回格式 { code, message, data }', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ code: 0, message: 'success', data: 'Hello World!' });
  });

  it('/not-exist (GET) 路由不存在 → 10003', () => {
    return request(app.getHttpServer())
      .get('/not-exist')
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe(10003);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
