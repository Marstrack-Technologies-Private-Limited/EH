import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ensureSession, selectIsApiAuthenticated } from "@/store/auth-slice.js";
import {
  listCategories,
  listServices,
  listTopics,
  listUsers,
  listUserCategories,
  listUserTopics,
} from "@/api/p2p.js";
import { getView } from "@/api/http.js";
import { USER_TYPE, VIEWS } from "@/api/config.js";
import { hasId } from "@/lib/utils.js";

/**
 * Generic loader for one of the view-backed lists.
 *
 * `fetcher` is called with no arguments; pass a stable (useCallback'd) function
 * or the effect will re-run on every render.
 */
export function useResource(fetcher, { enabled = true } = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ totalRecords: 0, totalPages: 0 });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (id !== reqId.current) return; // a newer request won
      setData(res.data || []);
      setMeta({
        totalRecords: res.totalRecords ?? res.data?.length ?? 0,
        totalPages: res.totalPages ?? 1,
      });
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err.message || "Something went wrong.");
      setData([]);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [fetcher, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, meta, loading, error, reload: load, setData };
}

/** View 1690 — categories. Sorting and search both run server-side. */
export function useCategories({ enabled = true, orderBy, sortDir, search } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () =>
      listCategories({
        orderBy,
        sortDir,
        searchAny: search
          ? { columns: ["OM_CATEGORY_NAME", "OM_CATEGORY_CREATED_BY"], text: search }
          : undefined,
      }),
    [orderBy, sortDir, search],
  );
  return useResource(fetcher, { enabled: enabled && authed });
}

/** View 1693 — topics, optionally scoped to one category. */
export function useTopics({ categoryId, enabled = true, orderBy, sortDir, search } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () =>
      listTopics({
        categoryId,
        orderBy,
        sortDir,
        searchAny: search
          ? { columns: ["TOPICNAME", "CATEGORYNAME"], text: search }
          : undefined,
      }),
    [categoryId, orderBy, sortDir, search],
  );
  return useResource(fetcher, { enabled: enabled && authed });
}

/** View 1696 — services, optionally scoped to one category. */
export function useServices({ categoryId, enabled = true, orderBy, sortDir, search } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () =>
      listServices({
        categoryId,
        orderBy,
        sortDir,
        searchAny: search
          ? {
              columns: ["OM_SERVICE_NAME", "OM_SERVICE_DESCRIPTION", "OM_CATEGORY_NAME"],
              text: search,
            }
          : undefined,
      }),
    [categoryId, orderBy, sortDir, search],
  );
  return useResource(fetcher, { enabled: enabled && authed });
}

/**
 * Row counts for the admin overview.
 *
 * Reads `totalRecords` off a 1-row page rather than pulling every row — the
 * envelope reports the full count regardless of pagesize.
 */
export function useCounts() {
  const authed = useSelector(selectIsApiAuthenticated);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(authed);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!authed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const one = { page: 1, pagesize: 1 };
      const [categories, topics, services, users, seekers, offerers] = await Promise.all([
        getView(VIEWS.CATEGORIES, one),
        getView(VIEWS.TOPICS, one),
        getView(VIEWS.SERVICES, one),
        getView(VIEWS.USERS, one),
        getView(VIEWS.USERS, {
          ...one,
          filters: { OM_USER_SEEKER_GUIDANCE_ALL: USER_TYPE.SEEKER },
        }),
        getView(VIEWS.USERS, {
          ...one,
          filters: { OM_USER_SEEKER_GUIDANCE_ALL: USER_TYPE.OFFERER },
        }),
      ]);
      setCounts({
        categories: categories.totalRecords,
        topics: topics.totalRecords,
        services: services.totalRecords,
        users: users.totalRecords,
        seekers: seekers.totalRecords,
        offerers: offerers.totalRecords,
      });
    } catch (err) {
      setError(err.message || "Could not load the summary.");
      setCounts(null);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    load();
  }, [load]);

  return { counts, loading, error, reload: load };
}

/**
 * Categories with their topics nested, shaped the way TopicPicker expects.
 *
 * Used by the public registration screen, so it bootstraps a service session
 * first — there are no user tokens before sign-up.
 */
export function useTaxonomy() {
  const dispatch = useDispatch();
  const authed = useSelector(selectIsApiAuthenticated);

  useEffect(() => {
    if (!authed) dispatch(ensureSession());
  }, [authed, dispatch]);

  const cats = useCategories({ enabled: authed });
  const tops = useTopics({ enabled: authed });

  const categories = useMemo(() => {
    const byCategory = new Map();
    for (const t of tops.data) {
      if (!byCategory.has(t.categoryId)) byCategory.set(t.categoryId, []);
      byCategory.get(t.categoryId).push({ id: String(t.id), name: t.name });
    }
    return cats.data
      .filter((c) => c.active)
      .map((c) => ({
        id: String(c.id),
        name: c.name,
        icon: "Tag",
        topics: byCategory.get(c.id) || [],
      }));
  }, [cats.data, tops.data]);

  // Depend on the two stable loaders, not the hook results, so `reload` keeps a
  // stable identity and is safe to pass into effects.
  const reloadCats = cats.reload;
  const reloadTops = tops.reload;
  const reload = useCallback(() => {
    reloadCats();
    reloadTops();
  }, [reloadCats, reloadTops]);

  return {
    categories,
    loading: cats.loading || tops.loading,
    error: cats.error || tops.error,
    reload,
  };
}

/** View 1699 — user master, filtered by SEEKER / OFFERER / ALL (or unfiltered). */
export function useUsers({ type, enabled = true, orderBy, sortDir, search } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () =>
      listUsers({
        type,
        orderBy,
        sortDir,
        searchAny: search
          ? {
              columns: [
                "OM_USER_NAME",
                "OM_USER_EMAIL",
                "OM_USER_CITY",
                "OM_USER_COUNTRY",
              ],
              text: search,
            }
          : undefined,
      }),
    [type, orderBy, sortDir, search],
  );
  return useResource(fetcher, { enabled: enabled && authed });
}

/** View 1703 — the categories one member has flagged as areas of interest. */
export function useUserCategories({ userId, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(() => listUserCategories({ userId }), [userId]);
  // Registration number 0 is a real id in this data, so test for null, not truthiness.
  return useResource(fetcher, { enabled: enabled && authed && hasId(userId) });
}

/** View 1704 — the topics one member has flagged as interests. */
export function useUserTopics({ userId, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(() => listUserTopics({ userId }), [userId]);
  return useResource(fetcher, { enabled: enabled && authed && hasId(userId) });
}

/**
 * The signed-in member's registration number.
 *
 * `regNo` is stamped onto the local user at login, but a session created before
 * that existed — or restored from storage — can be missing it, which would make
 * every interest screen look empty. So fall back to looking the member up by
 * email. Returns null for an admin, who genuinely has no member row.
 */
export function useMyRegNo(user) {
  const authed = useSelector(selectIsApiAuthenticated);
  const known = hasId(user?.regNo) ? user.regNo : null;
  const email = user?.email || "";

  const [resolved, setResolved] = useState(known);
  const [loading, setLoading] = useState(!hasId(known) && Boolean(email));

  useEffect(() => {
    if (hasId(known)) {
      setResolved(known);
      setLoading(false);
      return;
    }
    if (!authed || !email) {
      setResolved(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    listUsers({ page: 1, pagesize: 1, filters: { OM_USER_EMAIL: email } })
      .then((res) => {
        if (!cancelled) setResolved(hasId(res.data[0]?.id) ? res.data[0].id : null);
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [known, email, authed]);

  return { regNo: resolved, loading };
}

/**
 * Every member's interests, indexed by registration number.
 *
 * The offerer directory needs each offerer's areas and topics. Fetching them
 * per offerer would be one request per row, so both views are read whole once
 * (they are small — one row per user/interest pair) and grouped client-side.
 */
export function useInterestIndex({ enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const areasFetcher = useCallback(() => listUserCategories(), []);
  const topicsFetcher = useCallback(() => listUserTopics(), []);

  const areas = useResource(areasFetcher, { enabled: enabled && authed });
  const topics = useResource(topicsFetcher, { enabled: enabled && authed });

  const index = useMemo(() => {
    const map = new Map();
    const bucket = (id) => {
      if (!map.has(id)) map.set(id, { areas: [], topics: [] });
      return map.get(id);
    };
    for (const a of areas.data) bucket(a.userId).areas.push(a);
    for (const t of topics.data) bucket(t.userId).topics.push(t);
    return map;
  }, [areas.data, topics.data]);

  const reloadAreas = areas.reload;
  const reloadTopics = topics.reload;
  const reload = useCallback(() => {
    reloadAreas();
    reloadTopics();
  }, [reloadAreas, reloadTopics]);

  return {
    index,
    loading: areas.loading || topics.loading,
    error: areas.error || topics.error,
    reload,
  };
}
