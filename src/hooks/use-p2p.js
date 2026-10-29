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
  listSeeks,
  listSeekDetails,
  listSeekAttachments,
  listSeeksForCategories,
  listOffererResponses,
  listRatings,
} from "@/api/p2p.js";
import { getView } from "@/api/http.js";
import { USER_TYPE, VIEWS } from "@/api/config.js";
import { hasId } from "@/lib/utils.js";
import { matchSeekToOfferer, offererScope, parseSeekDetail } from "@/lib/seek-matching.js";

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
 * View 1818 — the seeks one seeker has raised, newest first.
 *
 * Filtered on OT_SEEKER_ID, which holds the seeker's registration number.
 * Registration number 0 is a real id here, so gate on hasId, not truthiness.
 */
export function useSeeks({ seekerId, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () => listSeeks({ seekerId, orderBy: "OT_SEEK_ASSISTANCE_ID", sortDir: "DESC" }),
    [seekerId],
  );
  return useResource(fetcher, { enabled: enabled && authed && hasId(seekerId) });
}

/**
 * View 1820 — the "problems reported" text, keyed by seek id.
 *
 * 1820 carries no seeker column, so a seeker's own details cannot be filtered
 * server-side. Reading the view whole and indexing by seek id costs one request
 * instead of one per listed seek; there is exactly one row per seek, so this
 * stays proportional to the number of seeks rather than to their contents.
 */
export function useSeekDetailIndex({ enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(() => listSeekDetails(), []);
  const details = useResource(fetcher, { enabled: enabled && authed });

  const index = useMemo(() => {
    const map = new Map();
    for (const d of details.data) map.set(d.seekId, d.problems);
    return map;
  }, [details.data]);

  return {
    index,
    loading: details.loading,
    error: details.error,
    reload: details.reload,
  };
}

/**
 * The seeker requests one offerer is entitled to answer — only what they offer.
 *
 * Their scope comes from their own interests: areas (view 1703) and topics
 * (view 1704). Seeks are read from 1818 for those categories, plus any seek
 * addressed to them by name, then every seek is checked against its topic line
 * (view 1820) by `matchSeekToOfferer` — see `lib/seek-matching.js` for the rule.
 *
 * Each returned seek carries `match` ({ reason, sharedTopics }) so the screen
 * can say why it is shown. `categoriesLoading` is separate so "still working it
 * out" and "you serve nothing" get different empty states.
 */
export function useOffererRequests({ offererId, offererName = "", includeClosed = false, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const on = enabled && authed;
  const areas = useUserCategories({ userId: offererId, enabled: on });
  const topics = useUserTopics({ userId: offererId, enabled: on });
  const details = useSeekDetailIndex({ enabled: on && hasId(offererId) });

  const name = offererName || areas.data[0]?.userName || topics.data[0]?.userName || "";
  const scope = useMemo(
    () => offererScope({ id: offererId, name, areas: areas.data, topics: topics.data }),
    [offererId, name, areas.data, topics.data],
  );

  const directIds = useMemo(() => {
    const ids = [];
    for (const [seekId, text] of details.index) {
      if (parseSeekDetail(text).to && matchSeekToOfferer({}, text, scope).visible) ids.push(seekId);
    }
    return ids;
  }, [details.index, scope]);

  // Key on joined ids, not array identity, so a reload that returns the same
  // scope does not refetch the seeks.
  const idsKey = scope.categoryIds.join(",");
  const directKey = directIds.join(",");
  const fetcher = useCallback(
    () =>
      listSeeksForCategories({
        categoryIds: idsKey ? idsKey.split(",") : [],
        seekIds: directKey ? directKey.split(",") : [],
        includeClosed,
      }),
    [idsKey, directKey, includeClosed],
  );

  const scopeReady = !areas.loading && !topics.loading && !details.loading;
  const seeks = useResource(fetcher, {
    enabled:
      on && hasId(offererId) && scopeReady && (scope.categoryIds.length > 0 || directIds.length > 0),
  });

  const data = useMemo(
    () =>
      seeks.data.flatMap((s) => {
        const match = matchSeekToOfferer(s, details.index.get(s.id), scope);
        return match.visible ? [{ ...s, match }] : [];
      }),
    [seeks.data, details.index, scope],
  );

  // Category names for every category in scope — areas carry them, and topics
  // do for categories picked only through a topic.
  const categories = useMemo(() => {
    const byId = new Map();
    for (const a of areas.data) byId.set(a.categoryId, a);
    for (const t of topics.data) {
      if (!byId.has(t.categoryId)) {
        byId.set(t.categoryId, { categoryId: t.categoryId, categoryName: t.categoryName });
      }
    }
    return [...byId.values()].filter((c) => scope.categoryIds.includes(c.categoryId));
  }, [areas.data, topics.data, scope.categoryIds]);

  const reloadAreas = areas.reload;
  const reloadTopics = topics.reload;
  const reloadDetails = details.reload;
  const reloadSeeks = seeks.reload;
  const reload = useCallback(() => {
    reloadAreas();
    reloadTopics();
    reloadDetails();
    reloadSeeks();
  }, [reloadAreas, reloadTopics, reloadDetails, reloadSeeks]);

  return {
    data,
    categories,
    categoryIds: scope.categoryIds,
    scope,
    details: details.index,
    categoriesLoading: areas.loading || topics.loading,
    loading:
      !scopeReady ||
      ((scope.categoryIds.length > 0 || directIds.length > 0) && seeks.loading),
    error: areas.error || topics.error || details.error || seeks.error,
    reload,
  };
}

/**
 * Views 1824 + 1825 — attachments grouped by seek id.
 *
 * Neither view carries a seeker column, so the same whole-read-and-index
 * approach as useSeekDetailIndex applies. One seek can have many attachments,
 * unlike its single detail row.
 */
export function useSeekAttachmentIndex({ enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(() => listSeekAttachments(), []);
  const attachments = useResource(fetcher, { enabled: enabled && authed });

  const index = useMemo(() => {
    const map = new Map();
    for (const a of attachments.data) {
      if (!map.has(a.seekId)) map.set(a.seekId, []);
      map.get(a.seekId).push(a);
    }
    return map;
  }, [attachments.data]);

  return {
    index,
    loading: attachments.loading,
    error: attachments.error,
    reload: attachments.reload,
  };
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

/**
 * View 1903 — offerer responses, indexed by seek id (newest first).
 *
 * Pass `offererId` to read only one offerer's responses (their inbox); omit it
 * to read every response (a seeker's view of who answered their seeks).
 */
export function useOffererResponseIndex({ offererId, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(() => listOffererResponses({ offererId }), [offererId]);
  const res = useResource(fetcher, { enabled: enabled && authed });

  const index = useMemo(() => {
    const map = new Map();
    for (const r of res.data) {
      if (!map.has(r.seekId)) map.set(r.seekId, []);
      map.get(r.seekId).push(r);
    }
    return map;
  }, [res.data]);

  return { ...res, index };
}

/** View 1906 — ratings, narrowed server-side to one offerer and/or seeker. */
export function useRatings({ offererId, seekerId, enabled = true } = {}) {
  const authed = useSelector(selectIsApiAuthenticated);
  const fetcher = useCallback(
    () => listRatings({ offererId, seekerId }),
    [offererId, seekerId],
  );
  return useResource(fetcher, {
    enabled: enabled && authed && (hasId(offererId) || hasId(seekerId)),
  });
}
