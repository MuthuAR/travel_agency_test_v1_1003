import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import { enquiryService } from '../services/enquiryService';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const get = vi.mocked(api.get);

describe('enquiryService.list', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 10 } });
  });

  it('sends only pagination when no filters are given', async () => {
    await enquiryService.list(1, 10);
    expect(get).toHaveBeenCalledWith('/enquiries', { params: { page: 1, page_size: 10 } });
  });

  it('omits empty filters', async () => {
    await enquiryService.list(2, 10, {});
    expect(get).toHaveBeenCalledWith('/enquiries', { params: { page: 2, page_size: 10 } });
  });

  it('sends the non-empty filters with numeric year and month', async () => {
    await enquiryService.list(1, 10, { status: 'ack', year: 2026, month: 3 });
    expect(get).toHaveBeenCalledWith('/enquiries', {
      params: { page: 1, page_size: 10, status: 'ack', year: 2026, month: 3 },
    });
  });

  it('sends a date as YYYY-MM-DD', async () => {
    await enquiryService.list(1, 10, { date: '2026-10-03' });
    expect(get).toHaveBeenCalledWith('/enquiries', {
      params: { page: 1, page_size: 10, date: '2026-10-03' },
    });
  });
});
