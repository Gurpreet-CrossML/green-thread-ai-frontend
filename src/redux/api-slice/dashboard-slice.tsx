import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { axiosInstance } from "@/redux/axios-config";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { ENDPOINTS } from "@/lib/config";

export type FeedbackInsightsResponse = {
  avg_handle_time: { value: number; unit: "seconds" | "minutes" };
  csat_score: { percentage: number };
  feedback_distribution: {
    positive: { value: number };
    neutral: { value: number };
    negative: { value: number };
  };
  performance_overview: {
    metric: string;
    value: number;
  }[];
};

export type EngagementResponse = {
  total_threads: number;
  sessions_resolved: number;
  avg_response_time_seconds: number;
};

export type OperationalEfficiencyResponse = {
  bot_resolution_rate: { percentage: number };
};

export type ConversionRateResponse = {
  percentage: number;
  converted_count: number;
  total_count: number;
};

export type UserMatrixResponse = {
  guest_user: number;
  signed_user: number;
};

export type ConversationHistoryPoint = {
  label: string;
  value: number;
};

export type ConversationHistoryResponse = {
  granularity: string;
  from_dt: string;
  to_dt: string;
  points: ConversationHistoryPoint[];
};

export const FetchConversationHistory = createAsyncThunk(
  "FetchConversationHistory",
  async (
    args: {
      storeCode: string;
      from?: string;
      to?: string;
      granularity?: string;
      aggregated?: boolean;
    },
    thunkAPI,
  ) => {
    try {
      const response = await axiosInstance.get(
        `${ENDPOINTS.fetchConversationHistory()}?store_code=${args.storeCode}&from=${args.from}&to=${args.to}&granularity=${args.granularity}&aggregated=${args.aggregated}`,
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch conversation history, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

// Consolidated dashboard payload (one request) — fanned out into the existing
// per-widget state below so the dashboard selectors don't change.
type DashboardSummaryResponse = {
  feedback_insights: FeedbackInsightsResponse | null;
  engagements: EngagementResponse | null;
  operational_efficiency: OperationalEfficiencyResponse | null;
  user_matrix: UserMatrixResponse | null;
  conversion_rate: ConversionRateResponse | null;
};

export const FetchDashboard = createAsyncThunk(
  "FetchDashboard",
  async (args: { storeCode: string }, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        `${ENDPOINTS.fetchDashboard()}?store_code=${args.storeCode}`,
      );
      return response.data.data as DashboardSummaryResponse;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch dashboard data, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

const DashboardSlice = createSlice({
  name: "Dashboard",
  initialState: {
    FetchFeedbackInsightsState: {
      FetchFeedbackInsightsIsLoading: false,
      FetchFeedbackInsightsIsSuccess: false,
      FetchFeedbackInsightsIsError: null as null | string | object,
      FetchFeedbackInsightsData: null as null | FeedbackInsightsResponse,
    },
    FetchEngagementDataState: {
      FetchEngagementDataIsLoading: false,
      FetchEngagementDataIsSuccess: false,
      FetchEngagementDataIsError: null as null | string | object,
      FetchEngagementData: null as null | EngagementResponse,
    },
    FetchOperationalEfficiencyDataState: {
      FetchOperationalEfficiencyDataIsLoading: false,
      FetchOperationalEfficiencyDataIsSuccess: false,
      FetchOperationalEfficiencyDataIsError: null as null | string | object,
      FetchOperationalEfficiencyData:
        null as null | OperationalEfficiencyResponse,
    },
    FetchUserMatrixState: {
      FetchUserMatrixIsLoading: false,
      FetchUserMatrixIsSuccess: false,
      FetchUserMatrixIsError: null as null | string | object,
      FetchUserMatrixData: null as null | UserMatrixResponse,
    },
    FetchConversionRateDataState: {
      FetchConversionRateDataIsLoading: false,
      FetchConversionRateDataIsSuccess: false,
      FetchConversionRateDataIsError: null as null | string | object,
      FetchConversionRateData: null as null | ConversionRateResponse,
    },
    FetchConversationHistoryState: {
      FetchConversationHistoryIsLoading: false,
      FetchConversationHistoryIsSuccess: false,
      FetchConversationHistoryIsError: null as null | string | object,
      FetchConversationHistoryData: null as null | ConversationHistoryResponse,
    },
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Conversation History
      .addCase(FetchConversationHistory.pending, (state) => {
        state.FetchConversationHistoryState.FetchConversationHistoryIsLoading = true;
        state.FetchConversationHistoryState.FetchConversationHistoryIsSuccess = false;
        state.FetchConversationHistoryState.FetchConversationHistoryIsError =
          null;
      })
      .addCase(FetchConversationHistory.fulfilled, (state, action) => {
        state.FetchConversationHistoryState.FetchConversationHistoryIsLoading = false;
        state.FetchConversationHistoryState.FetchConversationHistoryIsSuccess = true;
        state.FetchConversationHistoryState.FetchConversationHistoryData =
          action.payload;
      })
      .addCase(FetchConversationHistory.rejected, (state, action) => {
        state.FetchConversationHistoryState.FetchConversationHistoryIsLoading = false;
        state.FetchConversationHistoryState.FetchConversationHistoryIsSuccess = false;
        state.FetchConversationHistoryState.FetchConversationHistoryIsError =
          action.payload || "Something went wrong";
      })
      // Consolidated dashboard: one request fans out into all five widget states.
      .addCase(FetchDashboard.pending, (state) => {
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsLoading = true;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsSuccess = false;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsError = null;
        state.FetchEngagementDataState.FetchEngagementDataIsLoading = true;
        state.FetchEngagementDataState.FetchEngagementDataIsSuccess = false;
        state.FetchEngagementDataState.FetchEngagementDataIsError = null;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsLoading = true;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsSuccess = false;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsError =
          null;
        state.FetchUserMatrixState.FetchUserMatrixIsLoading = true;
        state.FetchUserMatrixState.FetchUserMatrixIsSuccess = false;
        state.FetchUserMatrixState.FetchUserMatrixIsError = null;
        state.FetchConversionRateDataState.FetchConversionRateDataIsLoading = true;
        state.FetchConversionRateDataState.FetchConversionRateDataIsSuccess = false;
        state.FetchConversionRateDataState.FetchConversionRateDataIsError =
          null;
      })
      .addCase(FetchDashboard.fulfilled, (state, action) => {
        const d = action.payload;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsLoading = false;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsSuccess = true;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsData =
          d.feedback_insights;
        state.FetchEngagementDataState.FetchEngagementDataIsLoading = false;
        state.FetchEngagementDataState.FetchEngagementDataIsSuccess = true;
        state.FetchEngagementDataState.FetchEngagementData = d.engagements;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsLoading = false;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsSuccess = true;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyData =
          d.operational_efficiency;
        state.FetchUserMatrixState.FetchUserMatrixIsLoading = false;
        state.FetchUserMatrixState.FetchUserMatrixIsSuccess = true;
        state.FetchUserMatrixState.FetchUserMatrixData = d.user_matrix;
        state.FetchConversionRateDataState.FetchConversionRateDataIsLoading = false;
        state.FetchConversionRateDataState.FetchConversionRateDataIsSuccess = true;
        state.FetchConversionRateDataState.FetchConversionRateData =
          d.conversion_rate;
      })
      .addCase(FetchDashboard.rejected, (state, action) => {
        const err = action.payload || "Something went wrong";
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsLoading = false;
        state.FetchFeedbackInsightsState.FetchFeedbackInsightsIsError = err;
        state.FetchEngagementDataState.FetchEngagementDataIsLoading = false;
        state.FetchEngagementDataState.FetchEngagementDataIsError = err;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsLoading = false;
        state.FetchOperationalEfficiencyDataState.FetchOperationalEfficiencyDataIsError =
          err;
        state.FetchUserMatrixState.FetchUserMatrixIsLoading = false;
        state.FetchUserMatrixState.FetchUserMatrixIsError = err;
        state.FetchConversionRateDataState.FetchConversionRateDataIsLoading = false;
        state.FetchConversionRateDataState.FetchConversionRateDataIsError = err;
      });
  },
});

export default DashboardSlice.reducer;
