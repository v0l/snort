import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NostrEvent, TaggedNostrEvent } from "@snort/system";

interface NoteCreatorStore {
  show: boolean;
  note: string;
  error: string;
  active: boolean;
  preview?: NostrEvent;
  replyTo?: TaggedNostrEvent;
  showAdvanced: boolean;
  selectedCustomRelays: false | Array<string>;
  zapForward: string;
  sensitive: string;
  pollOptions?: Array<string>;
  otherEvents: Array<NostrEvent>;
}

const InitState: NoteCreatorStore = {
  show: false,
  note: "",
  error: "",
  active: false,
  showAdvanced: false,
  selectedCustomRelays: false,
  zapForward: "",
  sensitive: "",
  otherEvents: [],
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
    setPreview: (state, action: PayloadAction<NostrEvent | undefined>) => {
      state.preview = action.payload;
    },
    setReplyTo: (state, action: PayloadAction<TaggedNostrEvent | undefined>) => {
      state.replyTo = action.payload;
    },
    setShowAdvanced: (state, action: PayloadAction<boolean>) => {
      state.showAdvanced = action.payload;
    },
    setSelectedCustomRelays: (state, action: PayloadAction<false | Array<string>>) => {
      state.selectedCustomRelays = action.payload;
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
    setOtherEvents: (state, action: PayloadAction<Array<NostrEvent>>) => {
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
  setSelectedCustomRelays,
  setZapForward,
  setSensitive,
  setPollOptions,
  setOtherEvents,
  reset,
} = NoteCreatorSlice.actions;

export const reducer = NoteCreatorSlice.reducer;
