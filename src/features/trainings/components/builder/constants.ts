import { BlockType } from './types';

export const BLOCK_COLORS: Record<BlockType, string> = {
    warmup: '#b1f0cc',    // Mint Green
    interval: '#fb8b8b',  // Salmon/Red
    recovery: '#c5e0fa',  // Pale Blue
    rest: '#e2e8f0',      // Light Slate
    cooldown: '#e2e8f0',  // Light Slate
};
