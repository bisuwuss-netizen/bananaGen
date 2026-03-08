import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types';

import { fallbackHomeCharactersConfig } from '../data/fallbackConfig';
import type { HomeCharactersApiPayload, HomeCharactersConfig } from '../types';

export const getHomeCharactersConfig = async (): Promise<HomeCharactersConfig> => {
  const response = await apiClient.get<ApiResponse<HomeCharactersApiPayload>>(
    '/api/home-characters/config'
  );

  return response.data.data?.config ?? fallbackHomeCharactersConfig;
};
