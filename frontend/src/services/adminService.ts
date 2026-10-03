import api from './api';
import type { AdminEnquiry, AdminEnquiryFilters, Paginated } from '../types';

export const adminService = {
  async listEnquiries(filters: AdminEnquiryFilters): Promise<Paginated<AdminEnquiry>> {
    const params: Record<string, string | number> = {
      page: filters.page,
      page_size: filters.page_size,
    };
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.start_date_from) params.start_date_from = filters.start_date_from;
    if (filters.start_date_to) params.start_date_to = filters.start_date_to;
    const res = await api.get<Paginated<AdminEnquiry>>('/admin/enquiries', { params });
    return res.data;
  },

  async getEnquiry(id: number): Promise<AdminEnquiry> {
    const res = await api.get<AdminEnquiry>(`/admin/enquiries/${id}`);
    return res.data;
  },
};
