"use client";

import { useEffect, useMemo, useState } from "react";
import type { OnChangeFn, PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/custom/data-table";
import { PAGE_SIZE_OPTIONS } from "@/components/custom/threads-data-table-pagination";
import { SearchInput } from "@/components/custom/search-input";
import { StoreAllowedIpsDrawer } from "@/components/custom/store-allowed-ips-drawer";
import { StoreWidgetScriptDialog } from "@/components/custom/store-widget-script-dialog";
import { getStoreColumns } from "@/components/custom/stores-columns";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  FetchStoresList,
  setSelectedStore,
  type StoreListItem,
} from "@/redux/api-slice/stores-slice";

export default function SettingsStore() {
  const dispatch = useAppDispatch();
  const selectedStore = useAppSelector(
    (state) => state.GetStoresReducer.selectedStore,
  );
  const { FetchStoresListData, FetchStoresListIsLoading } = useAppSelector(
    (state) => state.GetStoresReducer.FetchStoresListState,
  );

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  // The smallest entry in the shared pagination bar's options — anything
  // else leaves its "Rows per page" select showing no value.
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);

  const [ipsTarget, setIpsTarget] = useState<StoreListItem | null>(null);
  const [scriptTarget, setScriptTarget] = useState<StoreListItem | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const request = useMemo(
    () => ({ searchvalue: debouncedSearch, page, limit }),
    [debouncedSearch, page, limit],
  );
  useEffect(() => {
    dispatch(FetchStoresList(request));
  }, [dispatch, request]);

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: limit };
  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setPage(next.pageIndex + 1);
    setLimit(next.pageSize);
  };

  const handleSelect = (store: StoreListItem) => {
    dispatch(setSelectedStore(store.code));
    toast.success("Store switched", {
      description: `The dashboard is now working on ${store.name}.`,
    });
  };

  const columns = useMemo(
    () =>
      getStoreColumns({
        selectedStore,
        onEditAllowedIps: setIpsTarget,
        onGetWidgetScript: setScriptTarget,
        onSelect: handleSelect,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedStore],
  );

  const hasQuery = debouncedSearch.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search stores..."
        label="Search stores"
        className="w-full max-w-xs"
      />

      <DataTable
        columns={columns}
        data={FetchStoresListData.results}
        totalCount={FetchStoresListData.count}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        isLoading={FetchStoresListIsLoading}
        noun="store"
        emptyTitle={hasQuery ? "No matching stores" : "No stores yet"}
        emptyDescription={
          hasQuery
            ? "Try a different search."
            : "Stores appear here once they are added to your company."
        }
      />

      <StoreAllowedIpsDrawer
        store={ipsTarget}
        onOpenChange={(open) => !open && setIpsTarget(null)}
        onSaved={() => dispatch(FetchStoresList(request))}
      />

      <StoreWidgetScriptDialog
        store={scriptTarget}
        onOpenChange={(open) => !open && setScriptTarget(null)}
      />

    </div>
  );
}
