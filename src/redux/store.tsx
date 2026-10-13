import { configureStore } from "@reduxjs/toolkit";
import OnboardingSlice from "@/redux/api-slice/onboarding-slice";
import StoresSlice from "@/redux/api-slice/stores-slice";
import DashboardSlice from "@/redux/api-slice/dashboard-slice";
import ThreadSlice from "@/redux/api-slice/thread-slice";
import CustomizationSlice from "@/redux/api-slice/customization-slice";
import TenancySlice from "@/redux/api-slice/tenancy-slice";
import SupportTicketsSlice from "@/redux/api-slice/support-ticket-slice";
import AIUsageSlice from "@/redux/api-slice/ai-usage-slice";
import StoreSettingsSlice from "@/redux/api-slice/store-settings-slice";
import CustomerSlice from "@/redux/api-slice/customer-slice";
import OrderSlice from "@/redux/api-slice/order-slice";

const store = configureStore({
  reducer: {
    GetOnboardingReducer: OnboardingSlice,
    GetStoresReducer: StoresSlice,
    GetStoreSettingsReducer: StoreSettingsSlice,
    GetCustomerReducer: CustomerSlice,
    GetOrderReducer: OrderSlice,
    GetDashboardReducer: DashboardSlice,
    GetThreadReducer: ThreadSlice,
    GetCustomizationReducer: CustomizationSlice,
    GetTenancyReducer: TenancySlice,
    GetSupportTicketsReducer: SupportTicketsSlice,
    GetAIUsageReducer: AIUsageSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
