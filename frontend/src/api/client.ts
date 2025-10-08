import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Si luego tienes JWT:
api.interceptors.request.use(cfg => {
  const tok = localStorage.getItem("jwt");
  if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  return cfg;
});
