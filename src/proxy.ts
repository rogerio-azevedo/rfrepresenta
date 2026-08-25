import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const user = request.auth?.user;
  const isAuthRoute = pathname === "/login";
  const isAccessRouter = pathname === "/acesso";
  const isPasswordRoute = pathname === "/trocar-senha";
  const isAdminRoute = pathname.startsWith("/admin");
  const isClientRoute = pathname.startsWith("/catalogo");
  const isProtected = isAccessRouter || isPasswordRoute || isAdminRoute || isClientRoute;

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/acesso", request.url));
  }

  if (user?.mustChangePassword && !isPasswordRoute) {
    return NextResponse.redirect(new URL("/trocar-senha", request.url));
  }

  if (user && !user.mustChangePassword) {
    if (isAdminRoute && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/acesso", request.url));
    }
    if (isClientRoute && user.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/acesso", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/acesso",
    "/trocar-senha",
    "/admin/:path*",
    "/catalogo/:path*",
  ],
};
