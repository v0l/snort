import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RawEvent, TaggedRawEvent } from "@snort/nostr";

interface NoteCreatorStore {
  show: boolean;
  note: string;
  error: string;
  active: boolean;
  preview?: RawEvent;
  replyTo?: TaggedRawEvent;
  showAdvanced: boolean;
  zapForward: string;
  sensitive: string;
  pollOptions?: Array<string>;
  otherEvents: Array<RawEvent>;
}

const InitState: NoteCreatorStore = {
  show: false,
  note: "",
  error: "",
  active: false,
  showAdvanced: false,
  zapForward: "",
  sensitive: "",
  otherEvents: []
};

const NoteCreatorSlice = createSlice({
  name: "NoteCreator",
  initialState: InitState,
  reducers: {
    setShow: (state, action: PayloadAction<boolean>) => {
      state.show = action.payload;
    },
    setNote: (state, action: PayloadAction<string>) => {
      state.note = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setActive: (state, action: PayloadAction<boolean>) => {
      state.active = action.payload;
    },
    setPreview: (state, action: PayloadAction<RawEvent | undefined>) => {
      state.preview = action.payload;
    },
    setReplyTo: (state, action: PayloadAction<TaggedRawEvent | undefined>) => {
      state.replyTo = action.payload;
    },
    setShowAdvanced: (state, action: PayloadAction<boolean>) => {
      state.showAdvanced = action.payload;
    },
    setZapForward: (state, action: PayloadAction<string>) => {
      state.zapForward = action.payload;
    },
    setSensitive: (state, action: PayloadAction<string>) => {
      state.sensitive = action.payload;
    },
    setPollOptions: (state, action: PayloadAction<Array<string> | undefined>) => {
      state.pollOptions = action.payload;
    },
    setOtherEvents: (state, action: PayloadAction<Array<RawEvent>>) => {
      state.otherEvents = action.payload;
    },
    reset: () => InitState,
  },
});

export const {
  setShow,
  setNote,
  setError,
  setActive,
  setPreview,
  setReplyTo,
  setShowAdvanced,
  setZapForward,
  setSensitive,
  setPollOptions,
  setOtherEvents,
  reset,
} = NoteCreatorSlice.actions;

export const reducer = NoteCreatorSlice.reducer;
