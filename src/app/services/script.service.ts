import { Injectable } from '@angular/core';
import { ScriptStore } from '../store/script.store';

@Injectable({ providedIn: 'root' })
export class ScriptService {
  private readonly scripts: Record<string, { loaded: boolean; src: string }> = {};

  constructor() {
    ScriptStore.forEach((script) => {
      this.scripts[script.name] = {
        loaded: false,
        src: script.src,
      };
    });
  }

  load(...scripts: string[]): Promise<unknown[]> {
    return Promise.all(scripts.map((script) => this.loadScript(script)));
  }

  loadScript(name: string): Promise<unknown> {
    return new Promise((resolve) => {
      const entry = this.scripts[name];
      if (!entry) {
        resolve({ script: name, loaded: false, status: 'Unknown script' });
        return;
      }

      if (entry.loaded) {
        resolve({ script: name, loaded: true, status: 'Already Loaded' });
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = entry.src;
      script.onload = () => {
        entry.loaded = true;
        resolve({ script: name, loaded: true, status: 'Loaded' });
      };
      script.onerror = () => {
        resolve({ script: name, loaded: false, status: 'Failed to load' });
      };
      document.head.appendChild(script);
    });
  }
}
