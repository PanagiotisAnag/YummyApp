// Precise typing for the React Native subpath
declare module "firebase/auth/react-native" {
  import type { Persistence } from "firebase/auth";

  // AsyncStorage-like shape (we don't need full types here)
  type StorageLike = {
    getItem: (...args: any[]) => any;
    setItem: (...args: any[]) => any;
    removeItem: (...args: any[]) => any;
  };

  export function getReactNativePersistence(storage: StorageLike): Persistence;
}
