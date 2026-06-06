const syncRoutes = [
  "/wp-json/tcg-store/v1/offline/devices/register",
  "/wp-json/tcg-store/v1/offline/pull",
  "/wp-json/tcg-store/v1/offline/push",
]

export function App() {
  return (
    <main>
      <h1>TCG Store Offline</h1>
      <p>Windows offline sync shell for staff, kiosk, and manager workflows.</p>
      <ul>
        {syncRoutes.map((route) => (
          <li key={route}>{route}</li>
        ))}
      </ul>
    </main>
  )
}
