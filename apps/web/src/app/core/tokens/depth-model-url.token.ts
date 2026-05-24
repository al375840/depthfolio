import { InjectionToken } from '@angular/core';

export const DEPTH_MODEL_URL = new InjectionToken<string>('DEPTH_MODEL_URL', {
  providedIn: 'root',
  factory: () => '/models/midas-small.onnx',
});
