import { ApiConfigService } from './api-config.service';

describe('ApiConfigService', () => {
  const service = new ApiConfigService();

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a normalized api base url', () => {
    expect(service.apiBase).toBeTruthy();
    expect(service.apiBase.endsWith('/')).toBeFalse();
  });
});
