import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import {
  authSlice,
  interactionSlice,
  chatSlice,
  doctorSlice,
  notificationSlice,
  uiSlice,
  loadingSlice,
} from "./slices";

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    interaction: interactionSlice.reducer,
    chat: chatSlice.reducer,
    doctor: doctorSlice.reducer,
    notification: notificationSlice.reducer,
    ui: uiSlice.reducer,
    loading: loadingSlice.reducer,
  },
});

// Infer types for state and dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Custom hooks for type-safe state usage
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
