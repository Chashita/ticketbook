export function page(screen = "discover", params = {}) {
  return `/react/?${new URLSearchParams({ screen, ...params })}`;
}

export function signIn() {
  return page("account", { returnTo: location.pathname + location.search });
}
