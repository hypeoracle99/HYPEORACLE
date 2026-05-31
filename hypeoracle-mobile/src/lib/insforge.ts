import { createClient } from '@insforge/sdk';

// active InsForge mobile configurations
export const INSFORGE_CONFIG = {
  baseUrl: 'https://9s8ct2b5.us-east.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY',
};

// create unified client instance
export const client = createClient(INSFORGE_CONFIG);
