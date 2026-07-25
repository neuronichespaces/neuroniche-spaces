// 7-dimensional sensory taxonomy (expanded from 5-dim)
export type SensoryCategory = 'vestibular' | 'proprioception' | 'tactile' | 'auditory' | 'visual' | 'olfactory' | 'gustatory';
export type SensoryResponse = 'seeks' | 'avoids' | 'neutral';
export interface SensoryProfile { category: SensoryCategory; response: SensoryResponse; intensity: 1|2|3|4|5; }
export const SENSORY_WEIGHTS: Record<SensoryCategory, number> = { vestibular: 1.2, proprioception: 1.2, auditory: 1.0, tactile: 1.1, visual: 0.9, olfactory: 0.7, gustatory: 0.7 };
