import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * 应用全局配置（main.ts 与 e2e 测试共用，保证测试链路与线上行为一致）。
 * - 全局参数校验：白名单（剔除未声明字段）+ 类型转换
 * - 统一响应格式：{ code, message, data }
 * - 统一异常处理：错误码映射
 */
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
}

/** 注册 Swagger（仅 main.ts 调用） */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('点餐小程序 API')
    .setDescription('微信点餐小程序后端接口（AI Coding 模块化开发）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
