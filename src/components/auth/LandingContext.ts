import { createContext, useContext } from 'react';
export const LandingContext = createContext(false);
export const useLandingAuth = () => useContext(LandingContext);
