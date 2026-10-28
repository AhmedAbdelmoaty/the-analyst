const GAME_ROUTES = [
  "/play",
  "/games/reward-decision",
  "/games/behind-the-dots",
  "/games/crack-the-code",
  "/games/decision-matrix",
  "/games/investigation-file",
];

export function isGameRoute(pathname: string) {
  return GAME_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
