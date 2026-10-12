import type { ComponentType } from "react";

import {
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconImageGeneration,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

/**
 * One screen inside a multi-screen area.
 *
 * `description` is the short line on the area's menu card; `pageDescription`
 * is the longer one under the screen's own heading, falling back to the
 * short one when a screen doesn't need the distinction.
 */
export type AreaSection = {
  href: string;
  title: string;
  description: string;
  pageDescription?: string;
  icon: Icon;
  items?: AreaSection[];
};

export type NavArea = {
  href: string;
  title: string;
  description: string;
  icon: Icon;
  sections: AreaSection[];
  /** Rendered above the sub-sidebar's entries: an action the whole area shares. */
  action?: ComponentType;
};

/**
 * THE source for every multi-screen area: its menu page, its sub-sidebar,
 * and each screen's own heading all read from here.
 *
 * Adding a screen is one entry plus a page file — previously its title,
 * description and icon had to be repeated in the landing array, the page
 * itself, and the sidebar nav, which is how they drifted apart.
 *
 * A section's `href` may carry a query string. Help Desk's sections are
 * filters on one screen rather than separate pages, and the nav treats
 * them the same way as any other section — `activeNavUrl` decides which of
 * a group of siblings is the more specific match.
 */
export const NAV_AREAS = {
  settings: {
    href: "/settings",
    title: "Settings",
    description: "Manage your company, team, and connected platforms.",
    icon: IconSettings,
    sections: [
      {
        href: "/settings/general",
        title: "General",
        description: "Company profile — name, logo, and identity details.",
        pageDescription:
          "Your company's contact details, logo, and address. The name and code are managed by the platform operator.",
        icon: IconBuildingSkyscraper,
      },
      {
        href: "/settings/store",
        title: "Stores",
        description: "The stores connected to your company.",
        pageDescription:
          "Every store connected to your company. Switch which one the dashboard works on, limit its widget to specific IPs, or deactivate it.",
        icon: IconBuildingStore,
      },
      {
        href: "/settings/customisation",
        title: "Widget Customisation",
        description:
          "Colors, logo, messages, and quick links for the chat widget.",
        pageDescription:
          "How the chat widget looks on your storefront — colors, branding, messages, and quick links.",
        icon: IconImageGeneration,
      },
      // AI Usage is hidden for now. To bring it back, uncomment this entry and
      // rename app/settings/_ai-usage back to app/settings/ai-usage.
      // {
      //   href: "/settings/ai-usage",
      //   title: "AI Usage",
      //   description: "What the assistant costs to run, and how hard it works.",
      //   pageDescription:
      //     "Token spend, workflow costs and response latency for this store's assistant.",
      //   icon: IconChartBar,
      // },
    ],
  },
} as const satisfies Record<string, NavArea>;

export type NavAreaKey = keyof typeof NAV_AREAS;

/**
 * The section at `href`, with the area it belongs to. Typed as the wide
 * AreaSection so callers see optional fields that `as const` narrows away
 * on the sections which don't set them.
 */
export function findAreaSection(
  href: string,
): { key: NavAreaKey; area: NavArea; section: AreaSection } | undefined {
  for (const [key, area] of Object.entries(NAV_AREAS)) {
    // Depth-first: a section can hold its own screens, and a nested one
    // needs its heading and description found here just as much as a
    // top-level one — AreaSubPage throws when it is not.
    const section = findSection(area.sections, href);
    if (section) return { key: key as NavAreaKey, area, section };
  }
  return undefined;
}

function findSection(
  sections: readonly AreaSection[],
  href: string,
): AreaSection | undefined {
  for (const section of sections) {
    if (section.href === href) return section;
    const nested = section.items && findSection(section.items, href);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * `metadata` for a screen's page file, so the browser tab title and the
 * page heading can never disagree.
 */
export function areaSectionMetadata(href: string) {
  return { title: findAreaSection(href)?.section.title };
}
