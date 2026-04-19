import { http } from "./http";

export const EventsApi = {
  list: () => http("/api/events"),
  create: (data) => http("/api/events", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => http(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => http(`/api/events/${id}`, { method: "DELETE" }),
};
