import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RefreshDto } from './refresh.dto';

describe('LoginDto', () => {
  it('缺少 code → 校验失败', async () => {
    const dto = plainToInstance(LoginDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('code 非字符串 → 校验失败', async () => {
    const dto = plainToInstance(LoginDto, { code: 123 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('code 合法 → 校验通过', async () => {
    const dto = plainToInstance(LoginDto, { code: 'wx-code-abc' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});

describe('RefreshDto', () => {
  it('缺少 refreshToken → 校验失败', async () => {
    const dto = plainToInstance(RefreshDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('refreshToken 合法 → 校验通过', async () => {
    const dto = plainToInstance(RefreshDto, { refreshToken: 'jwt-token' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
