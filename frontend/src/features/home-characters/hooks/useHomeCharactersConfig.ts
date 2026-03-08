import { startTransition, useEffect, useState } from 'react';

import { getHomeCharactersConfig } from '../api/getHomeCharactersConfig';
import { fallbackHomeCharactersConfig } from '../data/fallbackConfig';
import type { HomeCharactersConfig } from '../types';

export const useHomeCharactersConfig = () => {
  const [config, setConfig] = useState<HomeCharactersConfig>(fallbackHomeCharactersConfig);

  useEffect(() => {
    let isCancelled = false;

    const loadConfig = async () => {
      try {
        const remoteConfig = await getHomeCharactersConfig();
        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setConfig(remoteConfig);
        });
      } catch (error) {
        console.error('加载首页角色配置失败，继续使用本地兜底配置:', error);
      }
    };

    void loadConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  return config;
};
