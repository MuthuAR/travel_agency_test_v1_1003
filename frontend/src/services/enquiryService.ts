import api from './api';
import type { Enquiry, EnquiryCreatePayload, EnquiryFilters, Paginated } from '../types';

export const enquiryService = {
  async create(payload: EnquiryCreatePayload): Promise<Enquiry> {
    const res = await api.post<Enquiry>('/enquiries', payload);
    return res.data;
  },

  async list(
    page: number,
    pageSize: number,
    filters?: EnquiryFilters,
  ): Promise<Paginated<Enquiry>> {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filters?.status) params.status = filters.status;
    if (filters?.year) params.year = filters.year;
    if (filters?.month) params.month = filters.month;
    if (filters?.date) params.date = filters.date;
    const res = await api.get<Paginated<Enquiry>>('/enquiries', { params });
    return res.data;
  },

  async get(id: number): Promise<Enquiry> {
    const res = await api.get<Enquiry>(`/enquiries/${id}`);
    return res.data;
  },
};
