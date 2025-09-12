import axios from 'axios';
import { HandCreateRequest, HandResponse, HandHistoryItem } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const handsApi = {
    create: async (data: HandCreateRequest): Promise<HandResponse> => {
        const response = await api.post<HandResponse>('/hands/', data);
        return response.data;
    },

    get: async (handId: string): Promise<HandResponse> => {
        const response = await api.get<HandResponse>(`/hands/${handId}`);
        return response.data;
    },

    list: async (limit: number = 10): Promise<HandHistoryItem[]> => {
        const response = await api.get<HandHistoryItem[]>('/hands/', {
            params: { limit },
        });
        return response.data;
    },

    delete: async (handId: string): Promise<void> => {
        await api.delete(`/hands/${handId}`);
    },
};