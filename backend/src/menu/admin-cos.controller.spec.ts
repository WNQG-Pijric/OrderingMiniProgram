import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CosService } from '../cos/cos.service';
import { AdminCosController } from './admin-cos.controller';

describe('AdminCosController（COS 临时密钥）', () => {
  let controller: AdminCosController;
  const mockCosService = { getSts: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCosController],
      providers: [{ provide: CosService, useValue: mockCosService }],
    })
      // 单测只验证 Controller 转发逻辑，guard 交给验收 / e2e 覆盖
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<AdminCosController>(AdminCosController);
  });

  it('GET /sts → service.getSts（返回临时密钥）', async () => {
    mockCosService.getSts.mockResolvedValue({
      tmpSecretId: 'a',
      tmpSecretKey: 'b',
      sessionToken: 'c',
    });
    const result = await controller.sts();
    expect(mockCosService.getSts).toHaveBeenCalled();
    expect(result).toEqual({
      tmpSecretId: 'a',
      tmpSecretKey: 'b',
      sessionToken: 'c',
    });
  });
});
