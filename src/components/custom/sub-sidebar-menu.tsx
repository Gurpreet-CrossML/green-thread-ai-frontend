"use client";

import Link from "next/link";
import { Icon, IconChevronRight } from "@tabler/icons-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  EXPANDED_MENU_BUTTON,
  SidebarMenuItemWrapper,
} from "@/components/custom/nav-main";
import {
  isBranchActive,
  isMenuItemActive,
  type SideBarMenuItem,
  type SubSidebarMenuItem,
} from "@/lib/sidebar-navs";
import { cn, titleWhenClipped } from "@/lib/utils";

/**
 * A sub-sidebar section that holds its own screens.
 *
 * Sub-sidebar only, by design and by location: the icon rail has no room
 * for a label, let alone a nested list, so a collapsible there would be a
 * chevron on a 36px square with its children hidden by the registry's
 * icon-mode rules. Keeping it out of nav-main means it cannot drift back.
 *
 * Those same icon-mode rules apply here — the sub-sidebar lives inside a
 * Sidebar pinned to its collapsed state — so the trigger, the sub list and
 * each child opt out of them explicitly. Without that the group rendered
 * as a lone icon with nothing beneath it.
 */
export function CollapsibleMenuItem({
  pathname,
  title,
  icon: ItemIcon,
  defaultOpen,
  items,
}: {
  pathname: string | null;
  title: string;
  icon?: Icon;
  defaultOpen?: boolean;
  items?: SideBarMenuItem[];
}) {
  return (
    <Collapsible
      asChild
      defaultOpen={defaultOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            // No tooltip: the label is right there. Tooltips exist to name
            // an icon that has none.
            className={cn("w-full", EXPANDED_MENU_BUTTON)}
          >
            {ItemIcon && <ItemIcon />}
            <span>{title}</span>
            <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0 group-data-[collapsible=icon]:flex">
            {items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={isMenuItemActive(pathname, subItem.url)}
                  className="group-data-[collapsible=icon]:flex data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:hover:bg-primary/15"
                  asChild
                >
                  <Link href={subItem.url}>
                    {subItem.icon && (
                      <subItem.icon
                        className={cn(
                          isMenuItemActive(pathname, subItem.url)
                            ? "text-primary!"
                            : "",
                        )}
                      />
                    )}
                    <span onMouseEnter={titleWhenClipped}>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/**
 * An area's sub-navigation: its action button, then its screens, with
 * nested groups collapsible. Shared by the docked sub-sidebar and the
 * phone drawer so the two cannot list different things.
 */
export function SubSidebarList({
  menu,
  pathname,
  search,
  activeUrl,
}: {
  menu: SubSidebarMenuItem;
  pathname: string | null;
  /** The current query string, without the leading "?". */
  search: string;
  /** The one open entry, as `activeNavUrl` decided it. */
  activeUrl: string | null;
}) {
  return (
    <>
      {menu.action && <menu.action />}
      <SidebarMenu>
        {menu.items.map((item) => {
          if (item.items && item.items.length > 0) {
            return (
              <CollapsibleMenuItem
                key={item.title}
                pathname={pathname}
                title={item.title}
                icon={item.icon}
                // Open when anything inside is the current screen — the
                // parent is a heading, not a link, so it is never the
                // active url itself.
                defaultOpen={isBranchActive(item, pathname, search)}
                items={item.items}
              />
            );
          }
          return (
            <SidebarMenuItemWrapper
              key={item.title}
              item={item}
              pathname={pathname}
              isActive={item.url === activeUrl}
              expanded
            />
          );
        })}
      </SidebarMenu>
    </>
  );
}
