import { atom } from "recoil";

// const localStorageMaintenance =
//   (key) =>
//   ({ setSelf, onSet }) => {
//     const saved = localStorage.getItem(key);
//     if (saved != null) {
//       setSelf(JSON.parse(saved));
//     }
//     onSet((newValue) => {
//       localStorage.setItem(key, JSON.stringify(newValue));
//     });
//   };

// export const snippetsAtom = atom({
//   key: "snippetsAtom",
//   default: [],
//   effects: [localStorageMaintenance("snippets")],
// });

export const snippetsAtom = atom({
  key: "snippetsAtom",
  default: [], 
});

export const snippetsLoadingAtom = atom({
  key: "snippetsLoadingAtom",
  default: false,
});

export const snippetsErrorAtom = atom({
  key: "snippetsErrorAtom",
  default: null,
});