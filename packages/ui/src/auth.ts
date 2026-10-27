"use client";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
let manager: UserManager | undefined;
export function oidc() {
  if (typeof window === "undefined")
    throw new Error("Sign-in is available in the browser");
  const authority = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const client_id = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  if (!authority || !client_id)
    throw new Error(
      "Sign-in is not configured. Configure the OIDC public client.",
    );
  return (manager ??= new UserManager({
    authority,
    client_id,
    redirect_uri: window.location.origin + "/auth/callback",
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: false,
    loadUserInfo: false,
  }));
}
export async function signIn() {
  await oidc().signinRedirect({
    state: { returnTo: window.location.pathname + window.location.search },
  });
}
export async function accessToken() {
  try {
    const user = await oidc().getUser();
    return user && !user.expired ? user.access_token : undefined;
  } catch {
    return undefined;
  }
}
export async function signOut() {
  await oidc().removeUser();
  window.location.assign("/");
}
export async function finishSignIn() {
  const user = await oidc().signinRedirectCallback();
  const state = user.state as { returnTo?: string } | undefined;
  const target = state?.returnTo;
  window.location.replace(
    target?.startsWith("/") && !target.startsWith("//") ? target : "/",
  );
}
