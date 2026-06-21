type Listener = () => void;
let listeners: Listener[] = [];

export const authEvents = {
  onForceLogout(cb: Listener) {
    listeners.push(cb);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  },
  emitForceLogout() {
    listeners.forEach((cb) => cb());
  },
};
