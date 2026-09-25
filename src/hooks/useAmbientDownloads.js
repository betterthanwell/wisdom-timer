import { useSyncExternalStore } from 'react';
import { ambientDownloads } from '../utils/ambientDownloads';

// Each ambient sound's download status ({ state, progress }), by id
export const useAmbientDownloads = () => useSyncExternalStore(ambientDownloads.subscribe, ambientDownloads.statuses);
