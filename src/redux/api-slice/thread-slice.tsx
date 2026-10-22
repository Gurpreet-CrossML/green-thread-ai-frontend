import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { axiosInstance } from "@/redux/axios-config";
import { ENDPOINTS } from "@/lib/config";
import { toast } from "sonner";
import { isAxiosError } from "axios";

type ThreadFilters = {
  from?: string;
  to?: string;
  search?: string;
  is_active?: boolean;
  need_escalation?: boolean;
  user_type?: string;
  has_feedback?: boolean;
  feedback_rating?: string;
  tags?: (string | ThreadTagData)[];
  handled_by?: string;
  assignee?: string[];
};

/** A tag as the threads endpoints return it. */
export type ThreadTagData = {
  id?: number;
  name: string;
  color: string;
  description: string;
};

export type FeedbackEntry = {
  id: number;
  rating: string;
  feedback_message: string | null;
  created_at: string;
};

export type FeedbackSequenceData = {
  feedback: FeedbackEntry | null;
};

type GetThreadsArgs = {
  store_code?: string;
  page?: number;
  limit?: number;
  filters?: ThreadFilters;
  skipListStateUpdate?: boolean;
};

export type Customer = {
  // Null for a guest.
  id: number | null;
  name: string;
  email: string;
};

export type ThreadHandlerUser = {
  id: number;
  name: string;
  email: string;
};

export type Thread = {
  id: string;
  name: string | null;
  customer: Customer | null;
  source?: "native" | null;
  chat_handler?: "ai" | "human";
  chat_handler_user?: ThreadHandlerUser | null;
  ai_responding: boolean;
  need_escalation: boolean;
  escalation_time: string | null;
  is_active: boolean;
  total_messages: number;
  created_at: string;
  last_message_at: string | null;
  cart_total: number;
  ended_at: string | null;
  tags?: (string | ThreadTagData)[];
  last_message?: string | null;
};

export type CartItem = {
  name: string;
  image: string;
  price: string;
  quantity: number;
  product_id: number;
};

export type CartDetails = {
  items: CartItem[];
  sub_total: string;
};

/** A tyre the tyre-selection assistant recommended (its `TeamOutput`). */
export type TyreRecommendation = {
  tyre_id?: string | null;
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  size?: string | null;
  load_index?: number | null;
  speed_rating?: string | null;
  season_title?: string | null;
  price?: number | null;
  currency?: string | null;
  in_stock?: number | null;
  buy_link?: string | null;
  image_url?: string | null;
};

export type ThreadJsonContent = {
  products?: ProductData[];
  /** Tyres recommended by the tyre-selection assistant. */
  recommendations?: TyreRecommendation[] | null;
  cart_details?: CartDetails;
  suggestions?: string[];
  /** Mirrors ChatHistory.confidence for resilient session reloads. */
  confidence?: number | null;
  /** Mirrors ChatHistory.source_used for resilient session reloads. */
  source_used?: string;
};

export type ThreadMessage = {
  id: string | number;
  role: string;
  message: string;
  message_type?: "user_message" | "reply" | "internal" | "ai_action" | string;
  agent_name?: string | null;
  confidence?: number | null;
  source_used?: string;
  json_content?: ThreadJsonContent;
  image_url?: string | string[] | null;
  created_at: string;
  messaged_by: string;
  /** Sender's email, to show "You" for the signed-in agent. */
  messaged_by_email?: string | null;
};

/** One handover of a chat; a null agent name means the AI. */
export type HandlerEvent = {
  id: number | string;
  action: string;
  from_agent_name: string | null;
  to_agent_name: string | null;
  assigned_by_name: string | null;
  /** Emails, so the UI can show "You" for the signed-in user. */
  from_agent_email?: string | null;
  to_agent_email?: string | null;
  assigned_by_email?: string | null;
  after_message_id?: number | null;
  created_at: string;
};

export type ProductVariant = {
  variant_id: string;
  title: string;
  price: {
    amount: string;
    currency: string;
  };
  options: { name: string; value: string }[];
  available_for_sale: boolean;
  compare_at_price: string | null;
  discount: string | null;
};

export type ProductData = {
  id: string;
  name: string;
  image: string;
  description: string;
  price: string;
  product_url: string;
  available_for_sale: boolean;
  variants?: ProductVariant[];
};

export type ThreadVerdict = {
  confidence: number;
  created_at: string;
  query_summaries: string[];
  reason: string;
  resolved_count: number;
  total_queries: number;
  unresolved_count: number;
  verdict: string;
};

export type ThreadDetails = {
  id: string;
  name: string | null;
  store: number;
  customer_name: string | null;
  customer_email: string | null;
  /** Identity only; null for a guest. */
  customer: { id: number } | null;
  is_active: boolean;
  total_messages: number;
  created_at: string;
  ended_at: string | null;
  messages: ThreadMessage[];
  handler_events?: HandlerEvent[];
  verdict: ThreadVerdict;
  followup_level: number;
};

export type ThreadSummary = {
  conversation_summary: string;
};

// DRF-style paginated envelope.
export type ThreadsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Thread[];
};

export type AIInsightResponse = {
  underperforming_cases: string[];
  overperforming_cases: string[];
  resolution_success_rate: string;
  reason_for_score: string;
  tags: string[];
  ai_insight_required: boolean;
  next_actionable_items: string[];
};

export type CartData = {
  qty: number;
  sku: string;
  name: string;
  price: string;
  currency: string;
  product_id: number;
  product_url: string;
  product_image: string;
};

export type CartDataResponse = {
  thread_id: string;
  initial_cart_data: {
    items: CartData[];
    total: string;
  };
  updated_cart_data: {
    items: CartData[];
    total: string;
  };
};

export type UserMetadata = {
  thread_id: string;
  customer_name: string;
  geo_location: string;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
};

export const FetchThreads = createAsyncThunk<ThreadsResponse, GetThreadsArgs>(
  "Threads",
  async (
    {
      store_code = "",
      page = 1,
      limit = 10,
      filters = {},
    }: GetThreadsArgs = {},
    thunkAPI,
  ) => {
    try {
      // Values are URI-encoded (a tag like "Return & Refund" would otherwise
      // split the query at the "&"); arrays repeat the key so a value that
      // contains a comma survives too.
      const filteration =
        "&" +
        Object.entries(filters)
          .flatMap(([key, value]) =>
            (Array.isArray(value) ? value : [value]).map(
              (item) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`,
            ),
          )
          .join("&");

      const response = await axiosInstance.get(
        `${ENDPOINTS.fetchThreads()}?store_code=${store_code}&page=${page}&page_size=${limit}${filteration !== "&" ? filteration : ""}`,
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the threads, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchThreadDetails = createAsyncThunk(
  "ThreadDetails",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchThreadDetails(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the thread details, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const CreateInternalNote = createAsyncThunk(
  "CreateInternalNote",
  async (
    { threadId, message }: { threadId: string; message: string },
    thunkAPI,
  ) => {
    try {
      const response = await axiosInstance.post(
        ENDPOINTS.createInternalNote(),
        {
          thread_id: threadId,
          message,
        },
      );

      return response.data.data as ThreadMessage;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to save the internal note. Please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchUserMetadata = createAsyncThunk(
  "UserMetadata",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchUserMetadata(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the user metadata, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchConversationSummary = createAsyncThunk(
  "ConversationSummary",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchConversationSummary(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the conversation summary, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchFeedbackSequence = createAsyncThunk(
  "FeedbackSequence",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchFeedbackSequence(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the feedback sequence, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchTags = createAsyncThunk(
  "Tags",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(ENDPOINTS.fetchTags(threadId));
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message || "Unable to fetch the tags, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

/** Distinct tags across a store's threads, for the Threads page tags filter. */
export const FetchThreadTagOptions = createAsyncThunk(
  "ThreadTagOptions",
  async ({ store_code }: { store_code?: string } = {}, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchThreadTagOptions(),
        { params: { store_code } },
      );
      return response.data.data as string[];
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch tag options, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchAIInsight = createAsyncThunk(
  "AIInsight",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchAIInsight(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Unable to fetch the AI insights, please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const FetchCart = createAsyncThunk(
  "CartData",
  async (threadId: string, thunkAPI) => {
    try {
      const response = await axiosInstance.get(
        ENDPOINTS.fetchCartData(threadId),
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      // A 404 simply means no cart data exists for this thread — not an error worth surfacing.
      if (response?.status !== 404) {
        toast.error("Uh oh! Something went wrong.", {
          description:
            data?.message ||
            "Unable to fetch the cart data, please try again later.",
        });
      }

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

export const UploadMessageAttachments = createAsyncThunk(
  "UploadMessageAttachments",
  async ({ formData }: { formData: FormData }, thunkAPI) => {
    try {
      const response = await axiosInstance.post(
        ENDPOINTS.uploadAttachments(),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const data = response.data.data;

      return data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const data = response?.data;

      toast.error("Uh oh! Something went wrong.", {
        description:
          data?.message ||
          "Could not upload the selected image(s). Please try again later.",
      });

      return thunkAPI.rejectWithValue(data || "Something went wrong");
    }
  },
);

const ThreadSlice = createSlice({
  name: "Thread",
  initialState: {
    FetchThreadsState: {
      FetchThreadsIsLoading: false,
      FetchThreadsIsSuccess: false,
      FetchThreadsIsError: null as null | string | object | unknown,
      FetchThreadsListData: {
        count: 0,
        next: null,
        previous: null,
        results: [],
      } as ThreadsResponse,
    },
    FetchThreadDetailsState: {
      FetchThreadDetailsIsLoading: false,
      FetchThreadDetailsIsSuccess: false,
      FetchThreadDetailsIsError: null as null | string | object | unknown,
      FetchThreadDetailsData: {} as ThreadDetails,
    },
    CreateInternalNoteState: {
      CreateInternalNoteIsLoading: false,
      CreateInternalNoteIsSuccess: false,
      CreateInternalNoteIsError: null as null | string | object | unknown,
    },
    FetchUserMetadataState: {
      FetchUserMetadataIsLoading: false,
      FetchUserMetadataIsSuccess: false,
      FetchUserMetadataIsError: null as null | string | object | unknown,
      FetchUserMetadataData: {} as UserMetadata,
    },
    FetchConversationSummaryState: {
      FetchConversationSummaryIsLoading: false,
      FetchConversationSummaryIsSuccess: false,
      FetchConversationSummaryIsError: null as null | string | object | unknown,
      FetchConversationSummaryData: {} as ThreadSummary,
    },
    FetchFeedbackSequenceState: {
      FetchFeedbackSequenceIsLoading: false,
      FetchFeedbackSequenceIsSuccess: false,
      FetchFeedbackSequenceIsError: null as null | string | object | unknown,
      FetchFeedbackSequenceData: { feedback: null } as FeedbackSequenceData,
    },
    FetchTagsState: {
      FetchTagsIsLoading: false,
      FetchTagsIsSuccess: false,
      FetchTagsIsError: null as null | string | object | unknown,
      FetchTags: [] as string[],
    },
    FetchThreadTagOptionsState: {
      FetchThreadTagOptionsIsLoading: false,
      FetchThreadTagOptionsIsSuccess: false,
      FetchThreadTagOptionsIsError: null as null | string | object | unknown,
      FetchThreadTagOptionsData: [] as string[],
    },
    FetchAIInsightState: {
      FetchAIInsightIsLoading: false,
      FetchAIInsightIsSuccess: false,
      FetchAIInsightIsError: null as null | string | object | unknown,
      FetchAIInsightData: {} as AIInsightResponse,
    },
    FetchCartDataState: {
      FetchCartDataIsLoading: false,
      FetchCartDataIsSuccess: false,
      FetchCartDataIsError: null as null | string | object | unknown,
      FetchCartData: {} as CartDataResponse,
    },
    UploadMessageAttachmentsState: {
      UploadMessageAttachmentsIsLoading: false,
      UploadMessageAttachmentsIsSuccess: false,
      UploadMessageAttachmentsIsError: null as null | string | object | unknown,
    },
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(FetchThreads.pending, (state, action) => {
        if (action.meta.arg?.skipListStateUpdate) return;
        state.FetchThreadsState.FetchThreadsIsLoading = true;
        state.FetchThreadsState.FetchThreadsIsError = null;
        state.FetchThreadsState.FetchThreadsIsSuccess = false;
      })
      .addCase(FetchThreads.fulfilled, (state, action) => {
        if (action.meta.arg?.skipListStateUpdate) return;
        state.FetchThreadsState.FetchThreadsIsLoading = false;
        state.FetchThreadsState.FetchThreadsListData = action.payload;
        state.FetchThreadsState.FetchThreadsIsSuccess = true;
      })
      .addCase(FetchThreads.rejected, (state, action) => {
        if (action.meta.arg?.skipListStateUpdate) return;
        state.FetchThreadsState.FetchThreadsIsLoading = false;
        state.FetchThreadsState.FetchThreadsIsError = action.payload;
        state.FetchThreadsState.FetchThreadsIsSuccess = false;
      })
      .addCase(FetchThreadDetails.pending, (state) => {
        state.FetchThreadDetailsState.FetchThreadDetailsIsLoading = true;
        state.FetchThreadDetailsState.FetchThreadDetailsIsError = null;
        state.FetchThreadDetailsState.FetchThreadDetailsIsSuccess = false;
      })
      .addCase(FetchThreadDetails.fulfilled, (state, action) => {
        state.FetchThreadDetailsState.FetchThreadDetailsIsLoading = false;
        state.FetchThreadDetailsState.FetchThreadDetailsData = action.payload;
        state.FetchThreadDetailsState.FetchThreadDetailsIsSuccess = true;
      })
      .addCase(FetchThreadDetails.rejected, (state, action) => {
        state.FetchThreadDetailsState.FetchThreadDetailsIsLoading = false;
        state.FetchThreadDetailsState.FetchThreadDetailsIsError =
          action.payload;
        state.FetchThreadDetailsState.FetchThreadDetailsIsSuccess = false;
      })
      .addCase(CreateInternalNote.pending, (state) => {
        state.CreateInternalNoteState.CreateInternalNoteIsLoading = true;
        state.CreateInternalNoteState.CreateInternalNoteIsError = null;
        state.CreateInternalNoteState.CreateInternalNoteIsSuccess = false;
      })
      .addCase(CreateInternalNote.fulfilled, (state) => {
        state.CreateInternalNoteState.CreateInternalNoteIsLoading = false;
        state.CreateInternalNoteState.CreateInternalNoteIsSuccess = true;
      })
      .addCase(CreateInternalNote.rejected, (state, action) => {
        state.CreateInternalNoteState.CreateInternalNoteIsLoading = false;
        state.CreateInternalNoteState.CreateInternalNoteIsError =
          action.payload;
        state.CreateInternalNoteState.CreateInternalNoteIsSuccess = false;
      })
      .addCase(FetchUserMetadata.pending, (state) => {
        state.FetchUserMetadataState.FetchUserMetadataIsLoading = true;
        state.FetchUserMetadataState.FetchUserMetadataIsError = null;
        state.FetchUserMetadataState.FetchUserMetadataIsSuccess = false;
      })
      .addCase(FetchUserMetadata.fulfilled, (state, action) => {
        state.FetchUserMetadataState.FetchUserMetadataIsLoading = false;
        state.FetchUserMetadataState.FetchUserMetadataData = action.payload;
        state.FetchUserMetadataState.FetchUserMetadataIsSuccess = true;
      })
      .addCase(FetchUserMetadata.rejected, (state, action) => {
        state.FetchUserMetadataState.FetchUserMetadataIsLoading = false;
        state.FetchUserMetadataState.FetchUserMetadataIsError = action.payload;
        state.FetchUserMetadataState.FetchUserMetadataIsSuccess = false;
      })
      .addCase(FetchConversationSummary.pending, (state) => {
        state.FetchConversationSummaryState.FetchConversationSummaryIsLoading = true;
        state.FetchConversationSummaryState.FetchConversationSummaryIsError =
          null;
        state.FetchConversationSummaryState.FetchConversationSummaryIsSuccess = false;
      })
      .addCase(FetchConversationSummary.fulfilled, (state, action) => {
        state.FetchConversationSummaryState.FetchConversationSummaryIsLoading = false;
        state.FetchConversationSummaryState.FetchConversationSummaryData =
          action.payload;
        state.FetchConversationSummaryState.FetchConversationSummaryIsSuccess = true;
      })
      .addCase(FetchConversationSummary.rejected, (state, action) => {
        state.FetchConversationSummaryState.FetchConversationSummaryIsLoading = false;
        state.FetchConversationSummaryState.FetchConversationSummaryIsError =
          action.payload;
        state.FetchConversationSummaryState.FetchConversationSummaryIsSuccess = false;
      })
      .addCase(FetchFeedbackSequence.pending, (state) => {
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsLoading = true;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsError = null;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsSuccess = false;
      })
      .addCase(FetchFeedbackSequence.fulfilled, (state, action) => {
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsLoading = false;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceData =
          action.payload;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsSuccess = true;
      })
      .addCase(FetchFeedbackSequence.rejected, (state, action) => {
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsLoading = false;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsError =
          action.payload;
        state.FetchFeedbackSequenceState.FetchFeedbackSequenceIsSuccess = false;
      })
      .addCase(FetchTags.pending, (state) => {
        state.FetchTagsState.FetchTagsIsLoading = true;
        state.FetchTagsState.FetchTagsIsError = null;
        state.FetchTagsState.FetchTagsIsSuccess = false;
      })
      .addCase(FetchTags.fulfilled, (state, action) => {
        state.FetchTagsState.FetchTagsIsLoading = false;
        state.FetchTagsState.FetchTags = action.payload;
        state.FetchTagsState.FetchTagsIsSuccess = true;
      })
      .addCase(FetchTags.rejected, (state, action) => {
        state.FetchTagsState.FetchTagsIsLoading = false;
        state.FetchTagsState.FetchTagsIsError = action.payload;
        state.FetchTagsState.FetchTagsIsSuccess = false;
      })
      .addCase(FetchThreadTagOptions.pending, (state) => {
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsLoading = true;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsError = null;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsSuccess = false;
      })
      .addCase(FetchThreadTagOptions.fulfilled, (state, action) => {
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsLoading = false;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsData =
          action.payload;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsSuccess = true;
      })
      .addCase(FetchThreadTagOptions.rejected, (state, action) => {
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsLoading = false;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsError =
          action.payload;
        state.FetchThreadTagOptionsState.FetchThreadTagOptionsIsSuccess = false;
      })
      .addCase(FetchAIInsight.pending, (state) => {
        state.FetchAIInsightState.FetchAIInsightIsLoading = true;
        state.FetchAIInsightState.FetchAIInsightIsError = null;
        state.FetchAIInsightState.FetchAIInsightIsSuccess = false;
      })
      .addCase(FetchAIInsight.fulfilled, (state, action) => {
        state.FetchAIInsightState.FetchAIInsightIsLoading = false;
        state.FetchAIInsightState.FetchAIInsightData = action.payload;
        state.FetchAIInsightState.FetchAIInsightIsSuccess = true;
      })
      .addCase(FetchAIInsight.rejected, (state, action) => {
        state.FetchAIInsightState.FetchAIInsightIsLoading = false;
        state.FetchAIInsightState.FetchAIInsightIsError = action.payload;
        state.FetchAIInsightState.FetchAIInsightIsSuccess = false;
      })
      .addCase(FetchCart.pending, (state) => {
        state.FetchCartDataState.FetchCartDataIsLoading = true;
        state.FetchCartDataState.FetchCartDataIsError = null;
        state.FetchCartDataState.FetchCartDataIsSuccess = false;
      })
      .addCase(FetchCart.fulfilled, (state, action) => {
        state.FetchCartDataState.FetchCartDataIsLoading = false;
        state.FetchCartDataState.FetchCartData = action.payload;
        state.FetchCartDataState.FetchCartDataIsSuccess = true;
      })
      .addCase(FetchCart.rejected, (state, action) => {
        state.FetchCartDataState.FetchCartDataIsLoading = false;
        state.FetchCartDataState.FetchCartDataIsError = action.payload;
        state.FetchCartDataState.FetchCartDataIsSuccess = false;
      })
      .addCase(UploadMessageAttachments.pending, (state) => {
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsLoading = true;
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsError =
          null;
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsSuccess = false;
      })
      .addCase(UploadMessageAttachments.fulfilled, (state) => {
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsLoading = false;
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsSuccess = true;
      })
      .addCase(UploadMessageAttachments.rejected, (state, action) => {
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsLoading = false;
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsError =
          action.payload;
        state.UploadMessageAttachmentsState.UploadMessageAttachmentsIsSuccess = false;
      });
  },
});

export default ThreadSlice.reducer;
