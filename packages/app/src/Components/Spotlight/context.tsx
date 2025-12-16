import { createContext, type ReactNode, useState } from "react";
import Modal from "../Modal/Modal";
import { SpotlightMedia } from "./SpotlightMedia";

interface SpotlightContextState {
  hide: () => void;
  showImages: (i: Array<string>) => void;
  setIndex: (v: number) => void;
}

export const SpotlightContext = createContext<SpotlightContextState | undefined>(undefined);

export function SpotlightContextWrapper({ children }: { children: ReactNode }) {
  const [imageIdx, setImageIdx] = useState(0);
  const [images, setImages] = useState<Array<string>>();

  return (
    <SpotlightContext.Provider
      value={{
        hide: () => setImages(undefined),
        showImages: i => {
          setImages(i);
          setImageIdx(0);
        },
        setIndex: setImageIdx,
      }}>
      {images && (
        <Modal
          id="spotlight"
          onClose={e => {
            e.stopPropagation();
            setImages(undefined);
          }}
          bodyClassName="h-screen w-screen flex items-center justify-center">
          <SpotlightMedia media={images} idx={imageIdx} onClose={() => setImages(undefined)} />
        </Modal>
      )}
      {children}
    </SpotlightContext.Provider>
  );
}
