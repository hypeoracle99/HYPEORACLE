import { Buffer } from 'buffer';

if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {};
}
if (typeof (globalThis as any).process.browser === 'undefined') {
  (globalThis as any).process.browser = true;
}

if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis as any).crypto.getRandomValues === 'undefined') {
  (globalThis as any).crypto.getRandomValues = function (byteArray: any) {
    for (let i = 0; i < byteArray.length; i++) {
      byteArray[i] = Math.floor(Math.random() * 256);
    }
    return byteArray;
  };
}
