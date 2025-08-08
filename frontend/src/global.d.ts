import * as runtime from '../wailsjs/runtime/runtime';

declare global {
  interface Window {
    runtime?: typeof runtime;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// 这个空导出让TypeScript将文件视为一个模块
export {};
