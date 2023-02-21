import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TaggedRawEvent, u256 } from "@snort/nostr";

export interface TimelineCache {
  key: string;
  main: TaggedRawEvent[];
  related: TaggedRawEvent[];
  latest: TaggedRawEvent[];
  parent: TaggedRawEvent[];
}

export interface FeedCache {
  timeline: TimelineCache;
}

const InitState = {
  timeline: {
    key: "",
    main: [],
    related: [],
    latest: [],
    parent: [],
  },
} as FeedCache;

const CacheSlice = createSlice({
  name: "Cache",
  initialState: InitState,
  reducers: {
    setTimeline: (state, action: PayloadAction<TimelineCache>) => {
      state.timeline = action.payload;
    },
  },
});

export const { setTimeline } = CacheSlice.actions;

export const reducer = CacheSlice.reducer;
