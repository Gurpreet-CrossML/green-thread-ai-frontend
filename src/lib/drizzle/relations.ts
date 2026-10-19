import { relations } from "drizzle-orm/relations";
import {
  djangoContentType,
  authPermission,
  authGroup,
  authGroupPermissions,
  authUser,
  authUserGroups,
  authUserUserPermissions,
  revokedToken,
  userAuthState,
  djangoAdminLog,
  store,
  chatbotWidgetCustomization,
  chatbotWidgetCustomizationQuickActions,
  quickAction,
  quickLink,
  storeCredentials,
  chatCustomer,
  chatThread,
  chatHistory,
  chatbotFeedback,
  chatBotevent,
  chatThreadAssignment,
  aiInsights,
  sentimentAnalysis,
  sessionResolutionVerdict,
  userMetadata,
  citiesLightCountry,
  citiesLightRegion,
  citiesLightCity,
  citiesLightSubregion,
  company,
  companyMembership,
  aiUsage,
  aiAgentUsage,
} from "./schema";

export const authPermissionRelations = relations(
  authPermission,
  ({ one, many }) => ({
    djangoContentType: one(djangoContentType, {
      fields: [authPermission.contentTypeId],
      references: [djangoContentType.id],
    }),
    authGroupPermissions: many(authGroupPermissions),
    authUserUserPermissions: many(authUserUserPermissions),
  }),
);

export const djangoContentTypeRelations = relations(
  djangoContentType,
  ({ many }) => ({
    authPermissions: many(authPermission),
    djangoAdminLogs: many(djangoAdminLog),
  }),
);

export const authGroupPermissionsRelations = relations(
  authGroupPermissions,
  ({ one }) => ({
    authGroup: one(authGroup, {
      fields: [authGroupPermissions.groupId],
      references: [authGroup.id],
    }),
    authPermission: one(authPermission, {
      fields: [authGroupPermissions.permissionId],
      references: [authPermission.id],
    }),
  }),
);

export const authGroupRelations = relations(authGroup, ({ many }) => ({
  authGroupPermissions: many(authGroupPermissions),
  authUserGroups: many(authUserGroups),
}));

export const authUserGroupsRelations = relations(authUserGroups, ({ one }) => ({
  authUser: one(authUser, {
    fields: [authUserGroups.userId],
    references: [authUser.id],
  }),
  authGroup: one(authGroup, {
    fields: [authUserGroups.groupId],
    references: [authGroup.id],
  }),
}));

export const authUserRelations = relations(authUser, ({ many }) => ({
  authUserGroups: many(authUserGroups),
  authUserUserPermissions: many(authUserUserPermissions),
  revokedTokens: many(revokedToken),
  userAuthStates: many(userAuthState),
  djangoAdminLogs: many(djangoAdminLog),
  companyMemberships: many(companyMembership),
  aiUsages: many(aiUsage),
}));

export const authUserUserPermissionsRelations = relations(
  authUserUserPermissions,
  ({ one }) => ({
    authUser: one(authUser, {
      fields: [authUserUserPermissions.userId],
      references: [authUser.id],
    }),
    authPermission: one(authPermission, {
      fields: [authUserUserPermissions.permissionId],
      references: [authPermission.id],
    }),
  }),
);

export const revokedTokenRelations = relations(revokedToken, ({ one }) => ({
  authUser: one(authUser, {
    fields: [revokedToken.userId],
    references: [authUser.id],
  }),
}));

export const userAuthStateRelations = relations(userAuthState, ({ one }) => ({
  authUser: one(authUser, {
    fields: [userAuthState.userId],
    references: [authUser.id],
  }),
}));

export const djangoAdminLogRelations = relations(djangoAdminLog, ({ one }) => ({
  djangoContentType: one(djangoContentType, {
    fields: [djangoAdminLog.contentTypeId],
    references: [djangoContentType.id],
  }),
  authUser: one(authUser, {
    fields: [djangoAdminLog.userId],
    references: [authUser.id],
  }),
}));

export const chatbotWidgetCustomizationRelations = relations(
  chatbotWidgetCustomization,
  ({ one, many }) => ({
    store: one(store, {
      fields: [chatbotWidgetCustomization.storeId],
      references: [store.id],
    }),
    chatbotWidgetCustomizationQuickActions: many(
      chatbotWidgetCustomizationQuickActions,
    ),
    quickLinks: many(quickLink),
  }),
);

export const storeRelations = relations(store, ({ many }) => ({
  chatbotWidgetCustomizations: many(chatbotWidgetCustomization),
  storeCredentials: many(storeCredentials),
  chatThreads: many(chatThread),
  sessionResolutionVerdicts: many(sessionResolutionVerdict),
}));

export const chatbotWidgetCustomizationQuickActionsRelations = relations(
  chatbotWidgetCustomizationQuickActions,
  ({ one }) => ({
    chatbotWidgetCustomization: one(chatbotWidgetCustomization, {
      fields: [
        chatbotWidgetCustomizationQuickActions.chatbotwidgetcustomizationId,
      ],
      references: [chatbotWidgetCustomization.id],
    }),
    quickAction: one(quickAction, {
      fields: [chatbotWidgetCustomizationQuickActions.quickactionId],
      references: [quickAction.id],
    }),
  }),
);

export const quickActionRelations = relations(quickAction, ({ many }) => ({
  chatbotWidgetCustomizationQuickActions: many(
    chatbotWidgetCustomizationQuickActions,
  ),
}));

export const quickLinkRelations = relations(quickLink, ({ one }) => ({
  chatbotWidgetCustomization: one(chatbotWidgetCustomization, {
    fields: [quickLink.widgetId],
    references: [chatbotWidgetCustomization.id],
  }),
}));

export const storeCredentialsRelations = relations(
  storeCredentials,
  ({ one }) => ({
    store: one(store, {
      fields: [storeCredentials.storeId],
      references: [store.id],
    }),
  }),
);

export const chatThreadRelations = relations(chatThread, ({ one, many }) => ({
  chatCustomer: one(chatCustomer, {
    fields: [chatThread.customerId],
    references: [chatCustomer.id],
  }),
  store: one(store, {
    fields: [chatThread.storeId],
    references: [store.id],
  }),
  chatHistories: many(chatHistory),
  chatbotFeedbacks: many(chatbotFeedback),
  chatBotevents: many(chatBotevent),
  chatThreadAssignments: many(chatThreadAssignment),
  aiInsights: many(aiInsights),
  sentimentAnalyses: many(sentimentAnalysis),
  sessionResolutionVerdicts: many(sessionResolutionVerdict),
  userMetadata: many(userMetadata),
}));

export const chatCustomerRelations = relations(chatCustomer, ({ many }) => ({
  chatThreads: many(chatThread),
}));

export const chatHistoryRelations = relations(chatHistory, ({ one, many }) => ({
  chatThread: one(chatThread, {
    fields: [chatHistory.threadId],
    references: [chatThread.id],
  }),
  chatbotFeedbacks: many(chatbotFeedback),
  chatThreadAssignments: many(chatThreadAssignment),
}));

export const chatbotFeedbackRelations = relations(
  chatbotFeedback,
  ({ one }) => ({
    chatHistory: one(chatHistory, {
      fields: [chatbotFeedback.chatMessageId],
      references: [chatHistory.id],
    }),
    chatThread: one(chatThread, {
      fields: [chatbotFeedback.threadId],
      references: [chatThread.id],
    }),
  }),
);

export const chatBoteventRelations = relations(chatBotevent, ({ one }) => ({
  chatThread: one(chatThread, {
    fields: [chatBotevent.threadId],
    references: [chatThread.id],
  }),
}));

export const chatThreadAssignmentRelations = relations(
  chatThreadAssignment,
  ({ one }) => ({
    chatHistory: one(chatHistory, {
      fields: [chatThreadAssignment.afterMessageId],
      references: [chatHistory.id],
    }),
    chatThread: one(chatThread, {
      fields: [chatThreadAssignment.threadId],
      references: [chatThread.id],
    }),
  }),
);

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  chatThread: one(chatThread, {
    fields: [aiInsights.threadId],
    references: [chatThread.id],
  }),
}));

export const sentimentAnalysisRelations = relations(
  sentimentAnalysis,
  ({ one }) => ({
    chatThread: one(chatThread, {
      fields: [sentimentAnalysis.threadId],
      references: [chatThread.id],
    }),
  }),
);

export const sessionResolutionVerdictRelations = relations(
  sessionResolutionVerdict,
  ({ one }) => ({
    store: one(store, {
      fields: [sessionResolutionVerdict.storeId],
      references: [store.id],
    }),
    chatThread: one(chatThread, {
      fields: [sessionResolutionVerdict.threadId],
      references: [chatThread.id],
    }),
  }),
);

export const userMetadataRelations = relations(userMetadata, ({ one }) => ({
  chatThread: one(chatThread, {
    fields: [userMetadata.threadId],
    references: [chatThread.id],
  }),
}));

export const citiesLightRegionRelations = relations(
  citiesLightRegion,
  ({ one, many }) => ({
    citiesLightCountry: one(citiesLightCountry, {
      fields: [citiesLightRegion.countryId],
      references: [citiesLightCountry.id],
    }),
    citiesLightCities: many(citiesLightCity),
    citiesLightSubregions: many(citiesLightSubregion),
  }),
);

export const citiesLightCountryRelations = relations(
  citiesLightCountry,
  ({ many }) => ({
    citiesLightRegions: many(citiesLightRegion),
    citiesLightCities: many(citiesLightCity),
    citiesLightSubregions: many(citiesLightSubregion),
  }),
);

export const citiesLightCityRelations = relations(
  citiesLightCity,
  ({ one }) => ({
    citiesLightRegion: one(citiesLightRegion, {
      fields: [citiesLightCity.regionId],
      references: [citiesLightRegion.id],
    }),
    citiesLightCountry: one(citiesLightCountry, {
      fields: [citiesLightCity.countryId],
      references: [citiesLightCountry.id],
    }),
    citiesLightSubregion: one(citiesLightSubregion, {
      fields: [citiesLightCity.subregionId],
      references: [citiesLightSubregion.id],
    }),
  }),
);

export const citiesLightSubregionRelations = relations(
  citiesLightSubregion,
  ({ one, many }) => ({
    citiesLightCities: many(citiesLightCity),
    citiesLightCountry: one(citiesLightCountry, {
      fields: [citiesLightSubregion.countryId],
      references: [citiesLightCountry.id],
    }),
    citiesLightRegion: one(citiesLightRegion, {
      fields: [citiesLightSubregion.regionId],
      references: [citiesLightRegion.id],
    }),
  }),
);

export const companyMembershipRelations = relations(
  companyMembership,
  ({ one }) => ({
    company: one(company, {
      fields: [companyMembership.companyId],
      references: [company.id],
    }),
    authUser: one(authUser, {
      fields: [companyMembership.userId],
      references: [authUser.id],
    }),
  }),
);

export const companyRelations = relations(company, ({ many }) => ({
  companyMemberships: many(companyMembership),
  aiUsages: many(aiUsage),
}));

export const aiUsageRelations = relations(aiUsage, ({ one, many }) => ({
  company: one(company, {
    fields: [aiUsage.companyId],
    references: [company.id],
  }),
  authUser: one(authUser, {
    fields: [aiUsage.performedById],
    references: [authUser.id],
  }),
  aiAgentUsages: many(aiAgentUsage),
}));

export const aiAgentUsageRelations = relations(aiAgentUsage, ({ one }) => ({
  aiUsage: one(aiUsage, {
    fields: [aiAgentUsage.usageId],
    references: [aiUsage.id],
  }),
}));
