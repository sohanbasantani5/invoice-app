// True once the first page has hydrated in this browser tab. Entrance animations only play after that
// (client-side navigations), so a hard load never starts from invisible server-rendered content.
let done = false;
export const booted = () => done;
export const markBooted = () => {
  done = true;
};
