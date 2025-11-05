/// <reference types="react-scripts" />

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.svg";
declare module "*.gif";
