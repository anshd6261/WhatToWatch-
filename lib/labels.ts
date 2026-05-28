import type { MediaType, Status } from "./types";

export const MEDIA_TYPES: MediaType[] = ["movie", "series", "book", "other"];

export const TAB_LABEL: Record<MediaType, string> = {
  movie: "Movies",
  series: "Series",
  book: "Books",
  other: "Others",
};

export const STATUS_ORDER: Status[] = ["backlog", "active", "done"];

/** Column headings differ per media type. */
export const STATUS_LABEL: Record<MediaType, Record<Status, string>> = {
  movie: { backlog: "To Watch", active: "Watching", done: "Watched" },
  series: { backlog: "To Watch", active: "Watching", done: "Watched" },
  book: { backlog: "To Read", active: "Reading", done: "Read" },
  other: { backlog: "Saved", active: "In Progress", done: "Done" },
};

/** Verb used in the add box + empty states. */
export const ADD_VERB: Record<MediaType, string> = {
  movie: "Add a movie",
  series: "Add a series",
  book: "Add a book",
  other: "Paste a link",
};

export function statusLabel(type: MediaType, status: Status): string {
  return STATUS_LABEL[type][status];
}
