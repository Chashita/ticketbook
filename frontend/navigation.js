export function page(screen = "discover", params = {}) {
  const base = import.meta.env.MODE === "pages" ? "./" : "/react/";
  return `${base}?${new URLSearchParams({ screen, ...params })}`;
}

export function signIn() {
  return page("account", { returnTo: location.pathname + location.search });
}
