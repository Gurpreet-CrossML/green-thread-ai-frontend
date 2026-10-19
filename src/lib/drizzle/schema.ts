import {
  pgTable,
  unique,
  integer,
  varchar,
  index,
  foreignKey,
  bigint,
  timestamp,
  boolean,
  check,
  text,
  smallint,
  jsonb,
  uniqueIndex,
  numeric,
  uuid,
  doublePrecision,
  inet,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const djangoContentType = pgTable(
  "django_content_type",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "django_content_type_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    appLabel: varchar("app_label", { length: 100 }).notNull(),
    model: varchar({ length: 100 }).notNull(),
  },
  (table) => [
    unique("django_content_type_app_label_model_76bd3d3b_uniq").on(
      table.appLabel,
      table.model,
    ),
  ],
);

export const authPermission = pgTable(
  "auth_permission",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_permission_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    name: varchar({ length: 255 }).notNull(),
    contentTypeId: integer("content_type_id").notNull(),
    codename: varchar({ length: 100 }).notNull(),
  },
  (table) => [
    index("auth_permission_content_type_id_2f476e4b").using(
      "btree",
      table.contentTypeId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.contentTypeId],
      foreignColumns: [djangoContentType.id],
      name: "auth_permission_content_type_id_2f476e4b_fk_django_co",
    }),
    unique("auth_permission_content_type_id_codename_01ab375a_uniq").on(
      table.contentTypeId,
      table.codename,
    ),
  ],
);

export const authGroup = pgTable(
  "auth_group",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_group_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    name: varchar({ length: 150 }).notNull(),
  },
  (table) => [
    index("auth_group_name_a6ea08ec_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    unique("auth_group_name_key").on(table.name),
  ],
);

export const authGroupPermissions = pgTable(
  "auth_group_permissions",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_group_permissions_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    groupId: integer("group_id").notNull(),
    permissionId: integer("permission_id").notNull(),
  },
  (table) => [
    index("auth_group_permissions_group_id_b120cbf9").using(
      "btree",
      table.groupId.asc().nullsLast().op("int4_ops"),
    ),
    index("auth_group_permissions_permission_id_84c5c92e").using(
      "btree",
      table.permissionId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [authGroup.id],
      name: "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id",
    }),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [authPermission.id],
      name: "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm",
    }),
    unique("auth_group_permissions_group_id_permission_id_0cd325b0_uniq").on(
      table.groupId,
      table.permissionId,
    ),
  ],
);

export const authUser = pgTable(
  "auth_user",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_user_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    password: varchar({ length: 128 }).notNull(),
    lastLogin: timestamp("last_login", { withTimezone: true, mode: "string" }),
    isSuperuser: boolean("is_superuser").notNull(),
    username: varchar({ length: 150 }).notNull(),
    firstName: varchar("first_name", { length: 150 }).notNull(),
    lastName: varchar("last_name", { length: 150 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    isStaff: boolean("is_staff").notNull(),
    isActive: boolean("is_active").notNull(),
    dateJoined: timestamp("date_joined", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("auth_user_username_6821ab7c_like").using(
      "btree",
      table.username.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    unique("auth_user_username_key").on(table.username),
  ],
);

export const authUserGroups = pgTable(
  "auth_user_groups",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_user_groups_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    userId: integer("user_id").notNull(),
    groupId: integer("group_id").notNull(),
  },
  (table) => [
    index("auth_user_groups_group_id_97559544").using(
      "btree",
      table.groupId.asc().nullsLast().op("int4_ops"),
    ),
    index("auth_user_groups_user_id_6a12ed8b").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "auth_user_groups_user_id_6a12ed8b_fk_auth_user_id",
    }),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [authGroup.id],
      name: "auth_user_groups_group_id_97559544_fk_auth_group_id",
    }),
    unique("auth_user_groups_user_id_group_id_94350c0c_uniq").on(
      table.userId,
      table.groupId,
    ),
  ],
);

export const authUserUserPermissions = pgTable(
  "auth_user_user_permissions",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "auth_user_user_permissions_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    userId: integer("user_id").notNull(),
    permissionId: integer("permission_id").notNull(),
  },
  (table) => [
    index("auth_user_user_permissions_permission_id_1fbb5f2c").using(
      "btree",
      table.permissionId.asc().nullsLast().op("int4_ops"),
    ),
    index("auth_user_user_permissions_user_id_a95ead1b").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id",
    }),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [authPermission.id],
      name: "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm",
    }),
    unique("auth_user_user_permissions_user_id_permission_id_14a6b632_uniq").on(
      table.userId,
      table.permissionId,
    ),
  ],
);

export const revokedToken = pgTable(
  "revoked_token",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "revoked_token_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    jti: varchar({ length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    index("revoked_token_expires_at_a7f23f4d").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("revoked_token_jti_85422f2f_like").using(
      "btree",
      table.jti.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("revoked_token_user_id_c552fc68").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "revoked_token_user_id_c552fc68_fk_auth_user_id",
    }),
    unique("revoked_token_jti_key").on(table.jti),
  ],
);

export const userAuthState = pgTable(
  "user_auth_state",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "user_auth_state_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    tokenVersion: integer("token_version").notNull(),
    resetLinkVersion: integer("reset_link_version").notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "user_auth_state_user_id_9adf108d_fk_auth_user_id",
    }),
    unique("user_auth_state_user_id_key").on(table.userId),
    check("user_auth_state_token_version_check", sql`token_version >= 0`),
    check(
      "user_auth_state_reset_link_version_check",
      sql`reset_link_version >= 0`,
    ),
  ],
);

export const djangoAdminLog = pgTable(
  "django_admin_log",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "django_admin_log_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    actionTime: timestamp("action_time", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    objectId: text("object_id"),
    objectRepr: varchar("object_repr", { length: 200 }).notNull(),
    actionFlag: smallint("action_flag").notNull(),
    changeMessage: text("change_message").notNull(),
    contentTypeId: integer("content_type_id"),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    index("django_admin_log_content_type_id_c4bce8eb").using(
      "btree",
      table.contentTypeId.asc().nullsLast().op("int4_ops"),
    ),
    index("django_admin_log_user_id_c564eba6").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.contentTypeId],
      foreignColumns: [djangoContentType.id],
      name: "django_admin_log_content_type_id_c4bce8eb_fk_django_co",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "django_admin_log_user_id_c564eba6_fk_auth_user_id",
    }),
    check("django_admin_log_action_flag_check", sql`action_flag >= 0`),
  ],
);

export const store = pgTable(
  "store",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "store_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 200 }).notNull(),
    currency: varchar({ length: 3 }).notNull(),
    defaultLanguage: varchar("default_language", { length: 20 }).notNull(),
    country: varchar({ length: 100 }).notNull(),
    isFollowUpsAllowed: boolean("is_follow_ups_allowed").notNull(),
    allowedIps: jsonb("allowed_ips").notNull(),
    widgetKey: text("widget_key").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("store_code_5512d74c_like").using(
      "btree",
      table.code.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("store_name_fb31a80d_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    unique("store_name_key").on(table.name),
    unique("store_code_key").on(table.code),
  ],
);

export const chatbotWidgetCustomization = pgTable(
  "chatbot_widget_customization",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chatbot_widget_customization_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    primaryColor: varchar("primary_color", { length: 7 }),
    secondaryColor: varchar("secondary_color", { length: 7 }),
    tertiaryColor: varchar("tertiary_color", { length: 7 }),
    logo: varchar({ length: 255 }),
    welcomeMessage: varchar("welcome_message", { length: 500 }).notNull(),
    greetingMessage: varchar("greeting_message", { length: 180 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    storeId: bigint("store_id", { mode: "number" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [store.id],
      name: "chatbot_widget_customization_store_id_c92a0380_fk_store_id",
    }),
    unique("chatbot_widget_customization_store_id_key").on(table.storeId),
  ],
);

export const chatbotWidgetCustomizationQuickActions = pgTable(
  "chatbot_widget_customization_quick_actions",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chatbot_widget_customization_quick_actions_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    chatbotwidgetcustomizationId: bigint("chatbotwidgetcustomization_id", {
      mode: "number",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    quickactionId: bigint("quickaction_id", { mode: "number" }).notNull(),
  },
  (table) => [
    index(
      "chatbot_widget_customizati_chatbotwidgetcustomization_dbdfee1b",
    ).using(
      "btree",
      table.chatbotwidgetcustomizationId.asc().nullsLast().op("int8_ops"),
    ),
    index("chatbot_widget_customizati_quickaction_id_41680d88").using(
      "btree",
      table.quickactionId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.chatbotwidgetcustomizationId],
      foreignColumns: [chatbotWidgetCustomization.id],
      name: "chatbot_widget_custo_chatbotwidgetcustomi_dbdfee1b_fk_chatbot_w",
    }),
    foreignKey({
      columns: [table.quickactionId],
      foreignColumns: [quickAction.id],
      name: "chatbot_widget_custo_quickaction_id_41680d88_fk_quick_act",
    }),
    unique(
      "chatbot_widget_customiza_chatbotwidgetcustomizati_56a32df7_uniq",
    ).on(table.chatbotwidgetcustomizationId, table.quickactionId),
  ],
);

export const quickAction = pgTable("quick_action", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity({
      name: "quick_action_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
  name: varchar({ length: 255 }).notNull(),
  message: text().notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});

export const quickLink = pgTable(
  "quick_link",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "quick_link_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    name: varchar({ length: 255 }).notNull(),
    url: varchar({ length: 200 }).notNull(),
    priority: integer(),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    widgetId: bigint("widget_id", { mode: "number" }).notNull(),
  },
  (table) => [
    index("quick_link_widget_id_7a6f5641").using(
      "btree",
      table.widgetId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.widgetId],
      foreignColumns: [chatbotWidgetCustomization.id],
      name: "quick_link_widget_id_7a6f5641_fk_chatbot_w",
    }),
    check("quick_link_priority_check", sql`priority >= 0`),
  ],
);

export const storeCredentials = pgTable(
  "store_credentials",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "store_credentials_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    baseUrl: varchar("base_url", { length: 200 }).notNull(),
    apiUrl: varchar("api_url", { length: 200 }).notNull(),
    apiUsername: text("api_username"),
    apiPassword: text("api_password"),
    tyreMcpUrl: varchar("tyre_mcp_url", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    storeId: bigint("store_id", { mode: "number" }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [store.id],
      name: "store_credentials_store_id_3c6945c8_fk_store_id",
    }),
    unique("store_credentials_store_id_key").on(table.storeId),
  ],
);

export const otpStore = pgTable("otp_store", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity({
      name: "otp_store_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
  threadId: varchar("thread_id", { length: 150 }),
  email: varchar({ length: 254 }).notNull(),
  otp: varchar({ length: 6 }).notNull(),
  isVerified: boolean("is_verified").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
});

export const chatCustomer = pgTable(
  "chat_customer",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chat_customer_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar({ length: 254 }).notNull(),
    phone: varchar({ length: 20 }).notNull(),
    store: varchar({ length: 255 }),
    customerId: varchar("customer_id", { length: 50 }).notNull(),
    registeredAt: timestamp("registered_at", {
      withTimezone: true,
      mode: "string",
    }),
    modifiedAt: timestamp("modified_at", {
      withTimezone: true,
      mode: "string",
    }),
    ordersCount: integer("orders_count").notNull(),
    totalSpent: numeric("total_spent", { precision: 12, scale: 4 }).notNull(),
    acceptsEmailMarketing: boolean("accepts_email_marketing").notNull(),
    acceptsSmsMarketing: boolean("accepts_sms_marketing").notNull(),
    isEmailVerified: boolean("is_email_verified").notNull(),
    metadata: jsonb().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("chat_customer_phone_aa304e3d").using(
      "btree",
      table.phone.asc().nullsLast().op("text_ops"),
    ),
    index("chat_customer_phone_aa304e3d_like").using(
      "btree",
      table.phone.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    uniqueIndex("unique_customer_email_per_store")
      .using(
        "btree",
        table.store.asc().nullsLast().op("text_ops"),
        table.email.asc().nullsLast().op("text_ops"),
      )
      .where(
        sql`((store IS NOT NULL) AND (NOT (((store)::text = ''::text) AND (store IS NOT NULL))) AND (NOT ((email)::text = ''::text)))`,
      ),
    check("chat_customer_orders_count_check", sql`orders_count >= 0`),
  ],
);

export const chatThread = pgTable(
  "chat_thread",
  {
    id: uuid().primaryKey().notNull(),
    name: varchar({ length: 255 }),
    chatHandler: varchar("chat_handler", { length: 10 }).notNull(),
    aiResponding: boolean("ai_responding").notNull(),
    isActive: boolean("is_active").notNull(),
    needEscalation: boolean("need_escalation").notNull(),
    escalationTime: timestamp("escalation_time", {
      withTimezone: true,
      mode: "string",
    }),
    followupLevel: integer("followup_level").notNull(),
    source: varchar({ length: 20 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    chatHandlerUserId: integer("chat_handler_user_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint("customer_id", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    storeId: bigint("store_id", { mode: "number" }).notNull(),
  },
  (table) => [
    index("chat_thread_chat_handler_44f4c9ad").using(
      "btree",
      table.chatHandler.asc().nullsLast().op("text_ops"),
    ),
    index("chat_thread_chat_handler_44f4c9ad_like").using(
      "btree",
      table.chatHandler.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("chat_thread_chat_handler_user_id_b6c39021").using(
      "btree",
      table.chatHandlerUserId.asc().nullsLast().op("int4_ops"),
    ),
    index("chat_thread_customer_id_31f2879e").using(
      "btree",
      table.customerId.asc().nullsLast().op("int8_ops"),
    ),
    index("chat_thread_store_id_b856f451").using(
      "btree",
      table.storeId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [chatCustomer.id],
      name: "chat_thread_customer_id_31f2879e_fk_chat_customer_id",
    }),
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [store.id],
      name: "chat_thread_store_id_b856f451_fk_store_id",
    }),
  ],
);

export const chatHistory = pgTable(
  "chat_history",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chat_history_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    role: varchar({ length: 20 }).notNull(),
    message: text().notNull(),
    imageUrl: jsonb("image_url"),
    jsonContent: jsonb("json_content").notNull(),
    workflow: varchar({ length: 100 }),
    messageType: varchar("message_type", { length: 30 }).notNull(),
    confidence: doublePrecision(),
    sourceUsed: varchar("source_used", { length: 255 }).notNull(),
    responseTime: doublePrecision("response_time").notNull(),
    totalInputTokens: integer("total_input_tokens").notNull(),
    totalOutputTokens: integer("total_output_tokens").notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 8 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    messagedById: integer("messaged_by_id"),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    index("chat_histor_created_2850f7_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("chat_histor_message_aee83b_idx").using(
      "btree",
      table.messageType.asc().nullsLast().op("text_ops"),
    ),
    index("chat_histor_role_2d2777_idx").using(
      "btree",
      table.role.asc().nullsLast().op("text_ops"),
    ),
    index("chat_histor_thread__381e32_idx").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
    ),
    index("chat_history_messaged_by_id_3c647c76").using(
      "btree",
      table.messagedById.asc().nullsLast().op("int4_ops"),
    ),
    index("chat_history_thread_id_4bac8b19").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "chat_history_thread_id_4bac8b19_fk_chat_thread_id",
    }),
    check(
      "chat_history_total_input_tokens_check",
      sql`total_input_tokens >= 0`,
    ),
    check(
      "chat_history_total_output_tokens_check",
      sql`total_output_tokens >= 0`,
    ),
  ],
);

export const chatbotFeedback = pgTable(
  "chatbot_feedback",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chatbot_feedback_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    rating: varchar({ length: 10 }).notNull(),
    feedbackMessage: varchar("feedback_message", { length: 500 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    chatMessageId: bigint("chat_message_id", { mode: "number" }),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    index("chatbot_fee_thread__ce8e5f_idx").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("chatbot_feedback_chat_message_id_253617b0").using(
      "btree",
      table.chatMessageId.asc().nullsLast().op("int8_ops"),
    ),
    index("chatbot_feedback_thread_id_e45b9eb9").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.chatMessageId],
      foreignColumns: [chatHistory.id],
      name: "chatbot_feedback_chat_message_id_253617b0_fk_chat_history_id",
    }),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "chatbot_feedback_thread_id_e45b9eb9_fk_chat_thread_id",
    }),
  ],
);

export const chatBotevent = pgTable(
  "chat_botevent",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chat_botevent_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    productId: varchar("product_id", { length: 100 }),
    productName: varchar("product_name", { length: 255 }),
    category: varchar({ length: 255 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    index("chat_botevent_thread_id_aad111f3").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "chat_botevent_thread_id_aad111f3_fk_chat_thread_id",
    }),
  ],
);

export const chatThreadAssignment = pgTable(
  "chat_thread_assignment",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "chat_thread_assignment_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    action: varchar({ length: 20 }).notNull(),
    metadata: jsonb().notNull(),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    afterMessageId: bigint("after_message_id", { mode: "number" }),
    assignedById: integer("assigned_by_id"),
    fromAgentId: integer("from_agent_id"),
    threadId: uuid("thread_id").notNull(),
    toAgentId: integer("to_agent_id"),
  },
  (table) => [
    index("chat_thread_assignment_after_message_id_9dbc06a1").using(
      "btree",
      table.afterMessageId.asc().nullsLast().op("int8_ops"),
    ),
    index("chat_thread_assignment_assigned_by_id_fd34d330").using(
      "btree",
      table.assignedById.asc().nullsLast().op("int4_ops"),
    ),
    index("chat_thread_assignment_from_agent_id_b0a9f033").using(
      "btree",
      table.fromAgentId.asc().nullsLast().op("int4_ops"),
    ),
    index("chat_thread_assignment_thread_id_a2e79f57").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
    ),
    index("chat_thread_assignment_to_agent_id_2c50d010").using(
      "btree",
      table.toAgentId.asc().nullsLast().op("int4_ops"),
    ),
    index("chat_thread_thread__d36e15_idx").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops"),
      table.assignedAt.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.afterMessageId],
      foreignColumns: [chatHistory.id],
      name: "chat_thread_assignme_after_message_id_9dbc06a1_fk_chat_hist",
    }),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "chat_thread_assignment_thread_id_a2e79f57_fk_chat_thread_id",
    }),
  ],
);

export const aiInsights = pgTable(
  "ai_insights",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "ai_insights_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    conversationSummary: text("conversation_summary"),
    underperformingCases: jsonb("underperforming_cases").notNull(),
    overperformingCases: jsonb("overperforming_cases").notNull(),
    resolutionSuccessRate: numeric("resolution_success_rate", {
      precision: 5,
      scale: 2,
    }).notNull(),
    reasonForScore: text("reason_for_score").notNull(),
    tags: jsonb().notNull(),
    aiInsightRequired: boolean("ai_insight_required").notNull(),
    nextActionableItems: jsonb("next_actionable_items").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "ai_insights_thread_id_ff0c2d42_fk_chat_thread_id",
    }),
    unique("ai_insights_thread_id_key").on(table.threadId),
  ],
);

export const sentimentAnalysis = pgTable(
  "sentiment_analysis",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "sentiment_analysis_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    totalQueries: integer("total_queries").notNull(),
    resolvedQueries: integer("resolved_queries").notNull(),
    unresolvedQueries: integer("unresolved_queries").notNull(),
    resolvedQueriesList: jsonb("resolved_queries_list").notNull(),
    unresolvedQueriesList: jsonb("unresolved_queries_list").notNull(),
    topIntent: varchar("top_intent", { length: 50 }).notNull(),
    searchKeywords: jsonb("search_keywords").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "sentiment_analysis_thread_id_ad847984_fk_chat_thread_id",
    }),
    unique("sentiment_analysis_thread_id_key").on(table.threadId),
  ],
);

export const sessionResolutionVerdict = pgTable(
  "session_resolution_verdict",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "session_resolution_verdict_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    verdict: varchar({ length: 20 }).notNull(),
    reason: text(),
    confidence: doublePrecision().notNull(),
    totalQueries: integer("total_queries").notNull(),
    resolvedCount: integer("resolved_count").notNull(),
    unresolvedCount: integer("unresolved_count").notNull(),
    querySummaries: jsonb("query_summaries").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    storeId: bigint("store_id", { mode: "number" }),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    index("session_resolution_verdict_store_id_d0e896c1").using(
      "btree",
      table.storeId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.storeId],
      foreignColumns: [store.id],
      name: "session_resolution_verdict_store_id_d0e896c1_fk_store_id",
    }),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "session_resolution_verdict_thread_id_72042b2d_fk_chat_thread_id",
    }),
    unique("session_resolution_verdict_thread_id_key").on(table.threadId),
  ],
);

export const userMetadata = pgTable(
  "user_metadata",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "user_metadata_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    customerName: varchar("customer_name", { length: 255 }),
    geoLocation: varchar("geo_location", { length: 255 }),
    ipAddress: inet("ip_address"),
    deviceType: varchar("device_type", { length: 100 }),
    browser: varchar({ length: 100 }),
    os: varchar({ length: 100 }),
    initialCartData: jsonb("initial_cart_data").notNull(),
    updatedCartData: jsonb("updated_cart_data").notNull(),
    cartStatus: varchar("cart_status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThread.id],
      name: "user_metadata_thread_id_368d9e3f_fk_chat_thread_id",
    }),
    unique("user_metadata_thread_id_key").on(table.threadId),
  ],
);

export const citiesLightCountry = pgTable(
  "cities_light_country",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "cities_light_country_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    nameAscii: varchar("name_ascii", { length: 200 }).notNull(),
    slug: varchar({ length: 50 }).notNull(),
    geonameId: integer("geoname_id"),
    alternateNames: text("alternate_names"),
    name: varchar({ length: 200 }).notNull(),
    code2: varchar({ length: 2 }),
    code3: varchar({ length: 3 }),
    continent: varchar({ length: 2 }).notNull(),
    tld: varchar({ length: 5 }).notNull(),
    phone: varchar({ length: 20 }),
    translations: jsonb().notNull(),
  },
  (table) => [
    index("cities_light_country_code2_69c32e9a_like").using(
      "btree",
      table.code2.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_code3_89d251fa_like").using(
      "btree",
      table.code3.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_continent_e2c412a4").using(
      "btree",
      table.continent.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_country_continent_e2c412a4_like").using(
      "btree",
      table.continent.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_name_1d61d0d2").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_country_name_1d61d0d2_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_name_ascii_648cc5e3").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_country_name_ascii_648cc5e3_like").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_slug_3707a22c").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_country_slug_3707a22c_like").using(
      "btree",
      table.slug.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_country_tld_1fb2faaa").using(
      "btree",
      table.tld.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_country_tld_1fb2faaa_like").using(
      "btree",
      table.tld.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    unique("cities_light_country_geoname_id_key").on(table.geonameId),
    unique("cities_light_country_code2_key").on(table.code2),
    unique("cities_light_country_code3_key").on(table.code3),
  ],
);

export const citiesLightRegion = pgTable(
  "cities_light_region",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "cities_light_region_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    nameAscii: varchar("name_ascii", { length: 200 }).notNull(),
    slug: varchar({ length: 50 }).notNull(),
    geonameId: integer("geoname_id"),
    alternateNames: text("alternate_names"),
    name: varchar({ length: 200 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    geonameCode: varchar("geoname_code", { length: 50 }),
    countryId: integer("country_id").notNull(),
    translations: jsonb().notNull(),
  },
  (table) => [
    index("cities_light_region_country_id_b2782d49").using(
      "btree",
      table.countryId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_region_geoname_code_1b0d4e58").using(
      "btree",
      table.geonameCode.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_region_geoname_code_1b0d4e58_like").using(
      "btree",
      table.geonameCode.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_region_name_775f9496").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_region_name_775f9496_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_region_name_ascii_f085cb82").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_region_name_ascii_f085cb82_like").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_region_slug_1653969f").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_region_slug_1653969f_like").using(
      "btree",
      table.slug.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [citiesLightCountry.id],
      name: "cities_light_region_country_id_b2782d49_fk_cities_li",
    }),
    unique("cities_light_region_country_id_slug_3dd02103_uniq").on(
      table.slug,
      table.countryId,
    ),
    unique("cities_light_region_geoname_id_key").on(table.geonameId),
    unique("cities_light_region_country_id_name_6e5b3799_uniq").on(
      table.name,
      table.countryId,
    ),
  ],
);

export const citiesLightCity = pgTable(
  "cities_light_city",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "cities_light_city_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    nameAscii: varchar("name_ascii", { length: 200 }).notNull(),
    slug: varchar({ length: 50 }).notNull(),
    geonameId: integer("geoname_id"),
    alternateNames: text("alternate_names"),
    name: varchar({ length: 200 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    searchNames: text("search_names").notNull(),
    latitude: numeric({ precision: 8, scale: 5 }),
    longitude: numeric({ precision: 8, scale: 5 }),
    regionId: integer("region_id"),
    countryId: integer("country_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    population: bigint({ mode: "number" }),
    featureCode: varchar("feature_code", { length: 10 }),
    timezone: varchar({ length: 40 }),
    subregionId: integer("subregion_id"),
    translations: jsonb().notNull(),
  },
  (table) => [
    index("cities_light_city_country_id_cf310fd2").using(
      "btree",
      table.countryId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_city_feature_code_d43c9217").using(
      "btree",
      table.featureCode.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_city_feature_code_d43c9217_like").using(
      "btree",
      table.featureCode.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_city_name_4859e2a5").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_city_name_4859e2a5_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_city_name_ascii_1e56323b").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_city_name_ascii_1e56323b_like").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_city_population_d597eeb6").using(
      "btree",
      table.population.asc().nullsLast().op("int8_ops"),
    ),
    index("cities_light_city_region_id_f7ab977b").using(
      "btree",
      table.regionId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_city_slug_cb2251f8").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_city_slug_cb2251f8_like").using(
      "btree",
      table.slug.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_city_subregion_id_0926d2ad").using(
      "btree",
      table.subregionId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_city_timezone_0fb51b1e").using(
      "btree",
      table.timezone.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_city_timezone_0fb51b1e_like").using(
      "btree",
      table.timezone.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    foreignKey({
      columns: [table.regionId],
      foreignColumns: [citiesLightRegion.id],
      name: "cities_light_city_region_id_f7ab977b_fk_cities_light_region_id",
    }),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [citiesLightCountry.id],
      name: "cities_light_city_country_id_cf310fd2_fk_cities_li",
    }),
    foreignKey({
      columns: [table.subregionId],
      foreignColumns: [citiesLightSubregion.id],
      name: "cities_light_city_subregion_id_0926d2ad_fk_cities_li",
    }),
    unique("cities_light_city_region_id_subregion_id_slug_efb2e768_uniq").on(
      table.slug,
      table.regionId,
      table.subregionId,
    ),
    unique("cities_light_city_geoname_id_key").on(table.geonameId),
    unique("cities_light_city_region_id_subregion_id_name_cdfc77ea_uniq").on(
      table.name,
      table.regionId,
      table.subregionId,
    ),
  ],
);

export const citiesLightSubregion = pgTable(
  "cities_light_subregion",
  {
    id: integer()
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "cities_light_subregion_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 2147483647,
        cache: 1,
      }),
    name: varchar({ length: 200 }).notNull(),
    nameAscii: varchar("name_ascii", { length: 200 }).notNull(),
    slug: varchar({ length: 50 }).notNull(),
    geonameId: integer("geoname_id"),
    alternateNames: text("alternate_names"),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    geonameCode: varchar("geoname_code", { length: 50 }),
    countryId: integer("country_id").notNull(),
    regionId: integer("region_id"),
    translations: jsonb().notNull(),
  },
  (table) => [
    index("cities_light_subregion_country_id_9b32b484").using(
      "btree",
      table.countryId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_subregion_geoname_code_843acdc3").using(
      "btree",
      table.geonameCode.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_subregion_geoname_code_843acdc3_like").using(
      "btree",
      table.geonameCode.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_subregion_name_2882337e").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_subregion_name_2882337e_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_subregion_name_ascii_ecf9a336").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_subregion_name_ascii_ecf9a336_like").using(
      "btree",
      table.nameAscii.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("cities_light_subregion_region_id_c6e0b71f").using(
      "btree",
      table.regionId.asc().nullsLast().op("int4_ops"),
    ),
    index("cities_light_subregion_slug_43494546").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    index("cities_light_subregion_slug_43494546_like").using(
      "btree",
      table.slug.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    foreignKey({
      columns: [table.countryId],
      foreignColumns: [citiesLightCountry.id],
      name: "cities_light_subregi_country_id_9b32b484_fk_cities_li",
    }),
    foreignKey({
      columns: [table.regionId],
      foreignColumns: [citiesLightRegion.id],
      name: "cities_light_subregi_region_id_c6e0b71f_fk_cities_li",
    }),
    unique("cities_light_subregion_geoname_id_key").on(table.geonameId),
  ],
);

export const djangoSession = pgTable(
  "django_session",
  {
    sessionKey: varchar("session_key", { length: 40 }).primaryKey().notNull(),
    sessionData: text("session_data").notNull(),
    expireDate: timestamp("expire_date", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("django_session_expire_date_a5c62663").using(
      "btree",
      table.expireDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("django_session_session_key_c0390e0f_like").using(
      "btree",
      table.sessionKey.asc().nullsLast().op("varchar_pattern_ops"),
    ),
  ],
);

export const company = pgTable(
  "company",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "company_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 63 }).notNull(),
    logo: varchar({ length: 255 }),
    email: varchar({ length: 254 }),
    phone: varchar({ length: 20 }),
    street: varchar({ length: 255 }),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    cityId: integer("city_id"),
    countryId: integer("country_id"),
    stateId: integer("state_id"),
  },
  (table) => [
    index("company_city_id_bf231d2e").using(
      "btree",
      table.cityId.asc().nullsLast().op("int4_ops"),
    ),
    index("company_code_6058e8af_like").using(
      "btree",
      table.code.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("company_country_id_3fe7e9da").using(
      "btree",
      table.countryId.asc().nullsLast().op("int4_ops"),
    ),
    index("company_name_5abe57d9_like").using(
      "btree",
      table.name.asc().nullsLast().op("varchar_pattern_ops"),
    ),
    index("company_state_id_b89c18c4").using(
      "btree",
      table.stateId.asc().nullsLast().op("int4_ops"),
    ),
    unique("company_name_key").on(table.name),
    unique("company_code_key").on(table.code),
  ],
);

export const companyMembership = pgTable(
  "company_membership",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "company_membership_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    role: varchar({ length: 32 }).notNull(),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    companyId: bigint("company_id", { mode: "number" }).notNull(),
    userId: integer("user_id").notNull(),
  },
  (table) => [
    index("company_membership_company_id_9840e603").using(
      "btree",
      table.companyId.asc().nullsLast().op("int8_ops"),
    ),
    index("company_membership_user_id_21a9cb1c").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [company.id],
      name: "company_membership_company_id_9840e603_fk_company_id",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: "company_membership_user_id_21a9cb1c_fk_auth_user_id",
    }),
    unique("unique_user_company_membership").on(table.companyId, table.userId),
  ],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "ai_usage_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    feature: varchar({ length: 50 }).notNull(),
    isCustomerFacing: boolean("is_customer_facing").notNull(),
    status: varchar({ length: 20 }).notNull(),
    storeCode: varchar("store_code", { length: 100 }).notNull(),
    workflowId: varchar("workflow_id", { length: 100 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    referenceId: varchar("reference_id", { length: 64 }).notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    cachedInputTokens: integer("cached_input_tokens").notNull(),
    cacheWriteTokens: integer("cache_write_tokens").notNull(),
    reasoningTokens: integer("reasoning_tokens").notNull(),
    cost: numeric({ precision: 12, scale: 8 }).notNull(),
    latencyMs: doublePrecision("latency_ms").notNull(),
    metadata: jsonb().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    companyId: bigint("company_id", { mode: "number" }).notNull(),
    performedById: integer("performed_by_id"),
  },
  (table) => [
    index("ai_usage_company_a9d196_idx").using(
      "btree",
      table.companyId.asc().nullsLast().op("int8_ops"),
      table.createdAt.asc().nullsLast().op("int8_ops"),
    ),
    index("ai_usage_company_id_f69f5479").using(
      "btree",
      table.companyId.asc().nullsLast().op("int8_ops"),
    ),
    index("ai_usage_feature_a01508_idx").using(
      "btree",
      table.feature.asc().nullsLast().op("text_ops"),
    ),
    index("ai_usage_performed_by_id_c8d0734d").using(
      "btree",
      table.performedById.asc().nullsLast().op("int4_ops"),
    ),
    index("ai_usage_referen_74deb0_idx").using(
      "btree",
      table.referenceType.asc().nullsLast().op("text_ops"),
      table.referenceId.asc().nullsLast().op("text_ops"),
    ),
    index("ai_usage_store_c_d83866_idx").using(
      "btree",
      table.storeCode.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [company.id],
      name: "ai_usage_company_id_f69f5479_fk_company_id",
    }),
    foreignKey({
      columns: [table.performedById],
      foreignColumns: [authUser.id],
      name: "ai_usage_performed_by_id_c8d0734d_fk_auth_user_id",
    }),
    check("ai_usage_input_tokens_check", sql`input_tokens >= 0`),
    check("ai_usage_output_tokens_check", sql`output_tokens >= 0`),
    check("ai_usage_total_tokens_check", sql`total_tokens >= 0`),
    check("ai_usage_cached_input_tokens_check", sql`cached_input_tokens >= 0`),
    check("ai_usage_cache_write_tokens_check", sql`cache_write_tokens >= 0`),
    check("ai_usage_reasoning_tokens_check", sql`reasoning_tokens >= 0`),
  ],
);

export const aiAgentUsage = pgTable(
  "ai_agent_usage",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity({
        name: "ai_agent_usage_id_seq",
        startWith: 1,
        increment: 1,
        minValue: 1,
        maxValue: 9223372036854775807,
        cache: 1,
      }),
    agentId: varchar("agent_id", { length: 100 }).notNull(),
    model: varchar({ length: 255 }).notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    cachedInputTokens: integer("cached_input_tokens").notNull(),
    cacheWriteTokens: integer("cache_write_tokens").notNull(),
    reasoningTokens: integer("reasoning_tokens").notNull(),
    cost: numeric({ precision: 12, scale: 8 }).notNull(),
    latencyMs: doublePrecision("latency_ms").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    usageId: bigint("usage_id", { mode: "number" }).notNull(),
  },
  (table) => [
    index("ai_agent_us_agent_i_e44df3_idx").using(
      "btree",
      table.agentId.asc().nullsLast().op("text_ops"),
    ),
    index("ai_agent_us_model_713043_idx").using(
      "btree",
      table.model.asc().nullsLast().op("text_ops"),
    ),
    index("ai_agent_usage_usage_id_485f78da").using(
      "btree",
      table.usageId.asc().nullsLast().op("int8_ops"),
    ),
    foreignKey({
      columns: [table.usageId],
      foreignColumns: [aiUsage.id],
      name: "ai_agent_usage_usage_id_485f78da_fk_ai_usage_id",
    }),
    check("ai_agent_usage_input_tokens_check", sql`input_tokens >= 0`),
    check("ai_agent_usage_output_tokens_check", sql`output_tokens >= 0`),
    check("ai_agent_usage_total_tokens_check", sql`total_tokens >= 0`),
    check(
      "ai_agent_usage_cached_input_tokens_check",
      sql`cached_input_tokens >= 0`,
    ),
    check(
      "ai_agent_usage_cache_write_tokens_check",
      sql`cache_write_tokens >= 0`,
    ),
    check("ai_agent_usage_reasoning_tokens_check", sql`reasoning_tokens >= 0`),
  ],
);
