import { apiRequest } from "./queryClient";

export interface GeneratePressReleaseRequest {
  company: string;
  headline: string;
  copy: string;
  contact: string;
  quote?: string;
  competitors?: string;
}

export interface SendReleaseRequest {
  releaseId: number;
  recipientIds?: number[];
  subject?: string;
  customMessage?: string;
}

export interface EditReleaseRequest {
  releaseId: number;
  instruction: string;
  currentContent: string;
}

export const api = {
  generatePressRelease: async (data: GeneratePressReleaseRequest) => {
    const response = await apiRequest('POST', '/api/generate', data);
    return response.json();
  },

  getPressReleases: async () => {
    const response = await apiRequest('GET', '/api/releases');
    return response.json();
  },

  deletePressRelease: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/releases/${id}`);
    return response.json();
  },

  uploadContacts: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/contacts/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    return response.json();
  },

  getContacts: async () => {
    const response = await apiRequest('GET', '/api/contacts');
    return response.json();
  },

  deleteContact: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/contacts/${id}`);
    return response.json();
  },

  sendRelease: async (data: SendReleaseRequest) => {
    const response = await apiRequest('POST', '/api/send-release', data);
    return response.json();
  },

  updatePressRelease: async (id: number, data: { release: string }) => {
    const response = await apiRequest('PUT', `/api/releases/${id}`, data);
    return response.json();
  },

  editPressRelease: async (data: EditReleaseRequest) => {
    const response = await apiRequest('POST', `/api/releases/${data.releaseId}/edit`, {
      instruction: data.instruction,
      currentContent: data.currentContent
    });
    return response.json();
  },
};
