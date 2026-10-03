import api from './api';
import type { Enquiry, EnquiryCreatePayload, Paginated } from '../types';

export const enquiryService = {
  async create(payload: EnquiryCreatePayload): Promise<Enquiry> {
    const res = await api.post<Enquiry>('/enquiries', payload);
    return res.data;
  },

  async list(page: number, pageSize: number): Promise<Paginated<Enquiry>> {
    const res = await api.get<Paginated<Enquiry>>('/enquiries', {
      params: { page, page_size: pageSize },
    });
    return res.data;
  },

  async get(id: number): Promise<Enquiry> {
    const res = await api.get<Enquiry>(`/enquiries/${id}`);
    return res.data;
  },
};
