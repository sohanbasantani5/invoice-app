import { auth } from "./auth";
import { headers } from "next/headers";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}