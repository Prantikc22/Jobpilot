import axios from "axios";
import { supabase } from "./supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  // Admin token preference if explicitly set (admin pages)
  if (config.headers && config.headers["X-Use-Admin"] === "true") {
    const t = localStorage.getItem("jp_admin_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
    delete config.headers["X-Use-Admin"];
    return config;
  }
  // Otherwise Supabase user token
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export const adminApi = axios.create({ baseURL: API_BASE });
adminApi.interceptors.request.use((config) => {
  const t = localStorage.getItem("jp_admin_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
