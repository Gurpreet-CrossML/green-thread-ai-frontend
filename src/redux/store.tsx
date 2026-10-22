import { configureStore } from "@reduxjs/toolkit";
import StoresSlice from "@/redux/api-slice/stores-slice";
import DashboardSlice from "@/redux/api-slice/dashboard-slice";
import ThreadSlice from "@/redux/api-slice/thread-slice";
import TenancySlice from "@/redux/api-slice/tenancy-slice";
import StoreSettingsSlice from "@/redux/api-slice/store-settings-slice";

const store = configureStore({
  reducer: {
    GetStoresReducer: StoresSlice,
    GetStoreSettingsReducer: StoreSettingsSlice,
    GetDashboardReducer: DashboardSlice,
    GetThreadReducer: ThreadSlice,
    GetTenancyReducer: TenancySlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
