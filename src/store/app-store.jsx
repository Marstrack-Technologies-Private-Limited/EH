import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { USERS } from "@/data/users.js";
import { CATEGORIES, buildTopicIndex } from "@/data/categories.js";
import { REVIEWS } from "@/data/reviews.js";
import { CONVERSATIONS } from "@/data/conversations.js";

const STORAGE_KEY = "belop_state_v1";

function seed() {
  return {
    users: USERS,
    categories: CATEGORIES,
    reviews: REVIEWS,
    conversations: CONVERSATIONS,
    currentUserId: null,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    // shallow validation
    if (!parsed.users || !parsed.categories) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return { ...state, currentUserId: action.userId };
    case "LOGOUT":
      return { ...state, currentUserId: null };
    case "REGISTER":
      return {
        ...state,
        users: [...state.users, action.user],
        currentUserId: action.user.id,
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.userId ? { ...u, ...action.patch } : u,
        ),
      };
    case "ADD_REVIEW": {
      const reviews = [action.review, ...state.reviews];
      // recompute offerer aggregate rating
      const forOfferer = reviews.filter((r) => r.offererId === action.review.offererId);
      const avg = forOfferer.reduce((s, r) => s + r.rating, 0) / forOfferer.length;
      return {
        ...state,
        reviews,
        users: state.users.map((u) =>
          u.id === action.review.offererId
            ? { ...u, rating: Math.round(avg * 10) / 10, reviewsCount: forOfferer.length }
            : u,
        ),
      };
    }
    case "SEND_MESSAGE": {
      const { conversationId, message, participants } = action;
      const exists = state.conversations.find((c) => c.id === conversationId);
      if (exists) {
        return {
          ...state,
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c,
          ),
        };
      }
      return {
        ...state,
        conversations: [
          ...state.conversations,
          { id: conversationId, participants, messages: [message] },
        ],
      };
    }
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.category] };
    case "ADD_TOPIC":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.categoryId
            ? { ...c, topics: [...c.topics, action.topic] }
            : c,
        ),
      };
    case "DELETE_TOPIC":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.categoryId
            ? { ...c, topics: c.topics.filter((t) => t.id !== action.topicId) }
            : c,
        ),
      };
    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.categoryId),
      };
    case "RESET":
      return seed();
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const value = useMemo(() => {
    const { topics, cats } = buildTopicIndex(state.categories);
    const currentUser = state.users.find((u) => u.id === state.currentUserId) || null;
    return { state, dispatch, currentUser, topicIndex: { topics, cats } };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
